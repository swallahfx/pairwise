import { prisma } from "../../config/db";

type NotificationType =
  | "ORDER_UPDATE"
  | "OFFER_UPDATE"
  | "UPFRONT_UPDATE"
  | "CREATOR_REVIEW_STATUS"
  | "LISTING_REVIEW_STATUS"
  | "QUESTION_ASKED"
  | "QUESTION_ANSWERED"
  | "NEW_REVIEW";

export const notificationsRepository = {
  create(userId: string, type: NotificationType, message: string, link?: string) {
    return prisma.notification.create({ data: { userId, type, message, link } });
  },
  findMine(userId: string) {
    return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
  },
  countUnread(userId: string) {
    return prisma.notification.count({ where: { userId, isRead: false } });
  },
  markRead(id: string, userId: string) {
    return prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  },
  markAllRead(userId: string) {
    return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }
};
