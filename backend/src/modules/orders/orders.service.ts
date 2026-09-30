import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors";
import { env } from "../../config/env";
import { notificationsService } from "../notifications/notifications.service";
import { paymentsService } from "../payments/payments.service";
import { ordersRepository } from "./orders.repository";
import { RaiseDisputeInput, RespondToDisputeInput } from "./orders.schema";

const AUTO_APPROVE_DAYS = 7;

// Not an automatic deadline — nothing forces a decision when this passes.
// It's purely what the UI shows an admin ("response overdue by 2 days") so
// a party going silent is visible at a glance instead of something an
// admin has to notice by comparing dates themselves.
const DISPUTE_RESPONSE_DAYS = 5;

type OrderWithParties = Awaited<ReturnType<typeof ordersRepository.findById>>;

const DISPUTABLE_STATUSES = ["FUNDED", "IN_PROGRESS", "REVISION_REQUESTED", "SUBMITTED"];

// Every write below acts on money or on the state that controls when money
// moves, so each one checks the acting user is actually the developer or
// creator on that specific order — not just any authenticated user.
function assertIsDeveloper(order: NonNullable<OrderWithParties>, userId: string) {
  if (order.offer.developer.userId !== userId) {
    throw new ForbiddenError("Only the developer on this order can do that");
  }
}

function assertIsCreator(order: NonNullable<OrderWithParties>, userId: string) {
  if (order.offer.creator.userId !== userId) {
    throw new ForbiddenError("Only the creator on this order can do that");
  }
}

// Shared by the normal SUBMITTED->approve path and the DISPUTED->admin
// override path — both end the same way, actually moving money.
async function payoutToCreator(order: NonNullable<OrderWithParties>) {
  const recipientCode = order.offer.creator.paystackRecipientCode;
  if (!recipientCode) {
    throw new ConflictError("Creator has not set up a payout account yet");
  }
  let transfer: Awaited<ReturnType<typeof paymentsService.transferToCreator>>;
  try {
    transfer = await paymentsService.transferToCreator(
      order.priceKobo,
      recipientCode,
      `Payout for order ${order.id}`
    );
  } catch (err) {
    // Paystack's own message here is the actionable part (e.g. "You cannot
    // initiate third party payouts as a starter business" — an account-tier
    // restriction, not a bug) — surface it as a real 409 instead of letting
    // it fall through to the generic 500 handler, which logs it but tells
    // the caller nothing.
    throw new ConflictError(`Payout failed: ${err instanceof Error ? err.message : "unknown Paystack error"}`);
  }
  return ordersRepository.update(order.id, {
    status: "PAID",
    approvedAt: new Date(),
    paidAt: new Date(),
    paystackTransferCode: transfer.transfer_code
  });
}

// Every transition below is intentionally explicit and named after a step
// in the PRD's order state machine (Agreed -> Funded -> InProgress ->
// Submitted -> Approved/AutoApproved -> Paid). Nothing jumps straight from
// "developer clicked pay" to "creator got money" without passing through
// the states a dispute or a stuck order would need to reason about.
export const ordersService = {
  async getById(orderId: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order");
    return order;
  },

  listMine(userId: string, role: "DEVELOPER" | "CREATOR") {
    return ordersRepository.findMine(userId, role);
  },

  listMineEitherSide(userId: string) {
    return ordersRepository.findMineEitherSide(userId);
  },

  adminListAll() {
    return ordersRepository.findAll();
  },

  async createFromOffer(offerId: string, priceKobo: number) {
    const { platformFeeKobo, totalKobo } = paymentsService.computeFee(priceKobo);
    return ordersRepository.create(offerId, priceKobo, platformFeeKobo, totalKobo);
  },

  // Opens a Paystack transaction and hands back its hosted payment page —
  // the order stays AGREED until the payment is actually confirmed (see
  // confirmFunding), unlike a pre-authorized-card flow where you'd know
  // synchronously whether it succeeded.
  async fund(orderId: string, userId: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order");
    assertIsDeveloper(order, userId);
    if (order.status !== "AGREED") {
      throw new ConflictError(`Cannot fund an order in status ${order.status}`);
    }

    const reference = `order_${order.id}_${Date.now()}`;
    const callbackUrl = `${env.clientOrigin}/checkout/${order.id}/callback`;
    const { authorization_url } = await paymentsService.initializeTransaction(
      order.totalKobo,
      order.offer.developer.user.email,
      reference,
      callbackUrl,
      { orderId: order.id }
    );

    await ordersRepository.update(order.id, { paystackReference: reference });

    return { authorizationUrl: authorization_url };
  },

  // Called from two places that both need to be safe to call more than
  // once for the same order: the webhook (the durable source of truth,
  // but unreachable from a local dev server) and the page Paystack
  // redirects the browser back to after checkout (the only thing that
  // actually confirms funding in local/dev runs). Verifies against
  // Paystack directly rather than trusting the redirect's query params.
  async confirmFunding(reference: string) {
    const order = await ordersRepository.findByPaystackReference(reference);
    if (!order) throw new NotFoundError("Order");
    if (order.status !== "AGREED") {
      return order;
    }

    const verified = await paymentsService.verifyTransaction(reference);
    if (verified.status !== "success") {
      throw new ConflictError(`Payment was not successful (status: ${verified.status})`);
    }
    if (verified.amount !== order.totalKobo) {
      throw new ConflictError("Paid amount does not match the order total");
    }

    const updated = await ordersRepository.update(order.id, { status: "FUNDED", fundedAt: new Date() });
    notificationsService.notify(
      order.offer.creator.userId,
      "ORDER_UPDATE",
      `${order.offer.developer.user.name} funded an order — you can start work.`,
      `/orders/${order.id}`
    );
    return updated;
  },

  // The creator's own signal that they've started — funding only gets an
  // order to FUNDED (see confirmFunding), never further automatically.
  async markInProgress(orderId: string, userId: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order");
    assertIsCreator(order, userId);
    if (order.status !== "FUNDED") {
      throw new ConflictError("Order must be funded before work can start");
    }
    return ordersRepository.update(orderId, { status: "IN_PROGRESS" });
  },

  async submit(orderId: string, userId: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order");
    assertIsCreator(order, userId);
    if (order.status !== "IN_PROGRESS" && order.status !== "REVISION_REQUESTED") {
      throw new ConflictError(`Cannot submit from status ${order.status}`);
    }
    const updated = await ordersRepository.update(orderId, { status: "SUBMITTED", submittedAt: new Date() });
    notificationsService.notify(
      order.offer.developer.userId,
      "ORDER_UPDATE",
      `${order.offer.creator.user.name} submitted the work — review it.`,
      `/orders/${order.id}`
    );
    return updated;
  },

  async requestRevision(orderId: string, userId: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order");
    assertIsDeveloper(order, userId);
    if (order.status !== "SUBMITTED") {
      throw new ConflictError("Can only request revision on a submitted order");
    }
    const updated = await ordersRepository.update(orderId, { status: "REVISION_REQUESTED" });
    notificationsService.notify(
      order.offer.creator.userId,
      "ORDER_UPDATE",
      `${order.offer.developer.user.name} requested a revision.`,
      `/orders/${order.id}`
    );
    return updated;
  },

  async approve(orderId: string, userId: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order");
    assertIsDeveloper(order, userId);
    return ordersService.release(orderId, "APPROVED");
  },

  // Called by a scheduled job, not a user action — orders sitting in
  // SUBMITTED past the auto-approve window release automatically so a
  // creator is never stuck waiting on an unresponsive developer.
  async autoApproveOverdue() {
    const cutoff = new Date(Date.now() - AUTO_APPROVE_DAYS * 24 * 60 * 60 * 1000);
    const overdue = await ordersRepository.findFundedPastDeadline(cutoff);
    for (const order of overdue) {
      await ordersService.release(order.id, "AUTO_APPROVED");
    }
    return overdue.length;
  },

  async release(orderId: string, _resultStatus: "APPROVED" | "AUTO_APPROVED") {
    const order = await ordersRepository.findById(orderId);
    if (!order || order.status !== "SUBMITTED") {
      throw new ConflictError("Order must be submitted before it can be approved");
    }
    const updated = await payoutToCreator(order);
    notificationsService.notify(
      order.offer.creator.userId,
      "ORDER_UPDATE",
      `Payment released for "${order.offer.deliverable}".`,
      `/orders/${order.id}`
    );
    return updated;
  },

  // Self-service dispute: either party on the order can raise one, as long
  // as money is actually at stake (funded but not yet paid out) — this is
  // what a developer facing a creator who's gone quiet after a bad
  // delivery actually needs, instead of just not clicking "approve" and
  // hoping the 7-day auto-release doesn't quietly pay the creator anyway.
  async raiseDispute(orderId: string, userId: string, input: RaiseDisputeInput) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order");
    const isDeveloper = order.offer.developer.userId === userId;
    const isCreator = order.offer.creator.userId === userId;
    if (!isDeveloper && !isCreator) {
      throw new ForbiddenError("Only the developer or creator on this order can raise a dispute");
    }
    if (!DISPUTABLE_STATUSES.includes(order.status)) {
      throw new ConflictError(`Cannot raise a dispute on an order in status ${order.status}`);
    }

    const updated = await ordersRepository.update(orderId, {
      status: "DISPUTED",
      disputeReason: input.reason,
      disputedByUserId: userId,
      disputedAt: new Date()
    });

    const otherPartyId = isDeveloper ? order.offer.creator.userId : order.offer.developer.userId;
    const raiserName = isDeveloper ? order.offer.developer.user.name : order.offer.creator.user.name;
    notificationsService.notify(
      otherPartyId,
      "ORDER_UPDATE",
      `${raiserName} raised a dispute on "${order.offer.deliverable}" — respond within ${DISPUTE_RESPONSE_DAYS} days.`,
      `/orders/${orderId}`
    );
    return updated;
  },

  // The other party's chance to give their side before an admin decides —
  // not required, but if they never respond that's visible to whoever
  // resolves it, same as a party going silent on Upwork's dispute flow.
  async respondToDispute(orderId: string, userId: string, input: RespondToDisputeInput) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order");
    if (order.status !== "DISPUTED" || !order.disputedByUserId) {
      throw new ConflictError("This order doesn't have an open dispute");
    }
    if (order.disputedByUserId === userId) {
      throw new ForbiddenError("You raised this dispute — the other side needs to respond, not you");
    }
    const isDeveloper = order.offer.developer.userId === userId;
    const isCreator = order.offer.creator.userId === userId;
    if (!isDeveloper && !isCreator) {
      throw new ForbiddenError("Only the developer or creator on this order can respond to a dispute");
    }

    const updated = await ordersRepository.update(orderId, {
      disputeResponse: input.response,
      disputeRespondedAt: new Date()
    });
    notificationsService.notify(
      order.disputedByUserId,
      "ORDER_UPDATE",
      `The other side responded to your dispute on "${order.offer.deliverable}".`,
      `/orders/${orderId}`
    );
    return updated;
  },

  // The admin-facing counterpart to adminRefund below: adminRefund decides
  // the developer keeps their money, this decides the creator gets paid
  // anyway. Before this existed there was literally no way to resolve a
  // dispute in the creator's favor short of an admin manually flipping
  // database rows.
  async adminReleaseDisputed(orderId: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order");
    if (order.status !== "DISPUTED") {
      throw new ConflictError(`Cannot release an order in status ${order.status} — only a disputed order can be resolved this way`);
    }
    const updated = await payoutToCreator(order);
    const message = `An admin resolved the dispute on "${order.offer.deliverable}" — payment was released.`;
    notificationsService.notify(order.offer.creator.userId, "ORDER_UPDATE", message, `/orders/${orderId}`);
    notificationsService.notify(order.offer.developer.userId, "ORDER_UPDATE", message, `/orders/${orderId}`);
    return updated;
  },

  // Admin-only manual status overrides — see the identical note on
  // upfrontService.adminDispute/adminRefund: this never calls Paystack to
  // actually reverse money, it just records what an admin has determined
  // happened outside the platform after looking into a dispute.
  async adminDispute(orderId: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order");
    if (order.status === "PAID" || order.status === "REFUNDED") {
      throw new ConflictError(`Cannot dispute an order in status ${order.status}`);
    }
    const updated = await ordersRepository.update(orderId, { status: "DISPUTED" });
    const message = `Order "${order.offer.deliverable}" was marked disputed by an admin.`;
    notificationsService.notify(order.offer.developer.userId, "ORDER_UPDATE", message, `/orders/${order.id}`);
    notificationsService.notify(order.offer.creator.userId, "ORDER_UPDATE", message, `/orders/${order.id}`);
    return updated;
  },

  async adminRefund(orderId: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order");
    if (order.status !== "DISPUTED" && order.status !== "FUNDED") {
      throw new ConflictError(
        `Cannot refund an order in status ${order.status} — only a funded or disputed order can be marked refunded`
      );
    }
    const updated = await ordersRepository.update(orderId, { status: "REFUNDED" });
    const message = `Order "${order.offer.deliverable}" was marked refunded by an admin.`;
    notificationsService.notify(order.offer.developer.userId, "ORDER_UPDATE", message, `/orders/${order.id}`);
    notificationsService.notify(order.offer.creator.userId, "ORDER_UPDATE", message, `/orders/${order.id}`);
    return updated;
  }
};
