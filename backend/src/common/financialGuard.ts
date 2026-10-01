// Shared by every admin cascade-delete (creators, brands, products, requests,
// Upfront listings, user accounts): the one rule for what counts as "real
// money attached" and therefore has to block a delete rather than cascade
// through it. AGREED is the only pre-money Order/UpfrontPurchase status —
// nothing has been funded yet — so it's the only status that's safe to wipe
// out along with its parent. Anything past it has either held or moved funds.
export function orderIsFinancial(status: string): boolean {
  return status !== "AGREED";
}

export function purchaseIsFinancial(status: string): boolean {
  return status !== "AGREED";
}

export interface BlockedItem {
  type: "order" | "upfrontPurchase";
  id: string;
  detail: string;
}

export function describeBlockedOrder(order: { id: string; status: string; totalKobo: number }): BlockedItem {
  return {
    type: "order",
    id: order.id,
    detail: `Order #${order.id.slice(0, 8)} — ${order.status}, ₦${(order.totalKobo / 100).toLocaleString("en-NG")}`
  };
}

export function describeBlockedPurchase(
  purchase: { id: string; status: string; totalKobo: number },
  listingTitle: string
): BlockedItem {
  return {
    type: "upfrontPurchase",
    id: purchase.id,
    detail: `Upfront purchase on "${listingTitle}" — ${purchase.status}, ₦${(purchase.totalKobo / 100).toLocaleString("en-NG")}`
  };
}

export function blockedDeleteMessage(blocked: BlockedItem[]): string {
  return `Can't delete — real money is attached:\n${blocked.map((b) => `• ${b.detail}`).join("\n")}`;
}
