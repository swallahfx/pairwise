import { notificationsRepository } from "./notifications.repository";

type NotificationType =
  | "ORDER_UPDATE"
  | "OFFER_UPDATE"
  | "UPFRONT_UPDATE"
  | "CREATOR_REVIEW_STATUS"
  | "LISTING_REVIEW_STATUS"
  | "QUESTION_ASKED"
  | "QUESTION_ANSWERED"
  | "NEW_REVIEW";

// The one place every other module calls into to raise a notification —
// purely in-app for now (no outbound email service is configured), so this
// is what shows up in the bell icon, not an inbox. Never throws: a failed
// notification is a rough edge, not a reason to fail the order/listing
// action that triggered it, so callers fire-and-forget this.
export const notificationsService = {
  notify(userId: string, type: NotificationType, message: string, link?: string) {
    return notificationsRepository.create(userId, type, message, link).catch(() => undefined);
  },

  listMine(userId: string) {
    return notificationsRepository.findMine(userId);
  },

  async unreadCount(userId: string) {
    return notificationsRepository.countUnread(userId);
  },

  markRead(id: string, userId: string) {
    return notificationsRepository.markRead(id, userId);
  },

  markAllRead(userId: string) {
    return notificationsRepository.markAllRead(userId);
  }
};
