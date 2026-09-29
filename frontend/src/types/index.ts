export interface RateCardItem {
  id: string;
  deliverable: string;
  priceKobo: number;
  turnaroundDays: number;
}

export type GateStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface CreatorProfile {
  id: string;
  userId?: string;
  handle: string;
  platform: string;
  followerCount: number;
  engagementRate: number;
  nicheTags: string[];
  rateCardItems: RateCardItem[];
  user: { name: string; email?: string };
  minPriceKobo?: number;
  gateStatus?: GateStatus;
  bankAccountNumber?: string | null;
  bankCode?: string | null;
  bankAccountName?: string | null;
  paystackRecipientCode?: string | null;
  avgRating?: number | null;
  reviewCount?: number;
  replyRate?: number | null;
  avgReplyHours?: number | null;
}

export interface Review {
  id: string;
  rating: number;
  text: string;
  createdAt: string;
  developer: { user: { name: string } };
}

export interface CreatorReviews {
  reviews: Review[];
  avgRating: number | null;
  reviewCount: number;
}

export interface Product {
  id: string;
  name: string;
  niche: string;
  link: string;
  pitch: string;
  monetizationStatus: "PRE_REVENUE" | "EARLY_REVENUE" | "ESTABLISHED";
  mrrKobo: number | null;
  activeUsers: number | null;
}

export type OrderStatus =
  | "AGREED"
  | "FUNDED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "REVISION_REQUESTED"
  | "APPROVED"
  | "AUTO_APPROVED"
  | "PAID"
  | "DISPUTED"
  | "REFUNDED";

export interface Order {
  id: string;
  priceKobo: number;
  platformFeeKobo: number;
  totalKobo: number;
  status: OrderStatus;
  fundedAt: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  offer: {
    deliverable: string;
    creator: { userId: string; handle: string; user: { name: string } };
    developer: { userId: string; user: { name: string } };
  };
}

export interface AdvertRequest {
  id: string;
  budgetKobo: number;
  brief: string;
  nicheTags: string[];
  deadline: string;
  status?: "OPEN" | "CLOSED";
  product: Product;
  _count?: { offers: number };
}

export type OfferSource = "RATE_CARD" | "REQUEST" | "CUSTOM";
export type OfferStatus = "PENDING" | "ACCEPTED" | "COUNTERED" | "DECLINED";

export interface Offer {
  id: string;
  source: OfferSource;
  status: OfferStatus;
  priceKobo: number;
  deliverable: string;
  requestId: string | null;
  createdAt: string;
  creator: { handle: string; user: { name: string } };
  developer: { user: { name: string } };
  order: { id: string } | null;
}

export interface Applicant {
  id: string;
  priceKobo: number;
  deliverable: string;
  status: OfferStatus;
  creator: { handle: string; user: { name: string } };
}

export interface BrandProfile {
  id: string;
  companyName: string;
  website?: string | null;
  industry?: string | null;
  user: { name: string; email?: string };
  bankAccountNumber?: string | null;
  bankCode?: string | null;
  bankAccountName?: string | null;
  paystackRecipientCode?: string | null;
}

export type ListerType = "CREATOR" | "BRAND";

export interface UpfrontReview {
  id: string;
  rating: number;
  text: string;
  createdAt: string;
  buyer: { name: string };
}

export interface UpfrontListing {
  id: string;
  listerType: ListerType;
  title: string;
  niche: string;
  description: string;
  audienceSummary: string;
  pricePerSlotKobo: number;
  totalSlots: number;
  slotsSold: number;
  programDate: string;
  gateStatus: GateStatus;
  createdAt: string;
  creator?: { userId: string; handle: string; user: { name: string } } | null;
  brand?: { userId: string; companyName: string } | null;
  avgRating?: number | null;
  reviewCount?: number;
  reviews?: UpfrontReview[];
}

export type UpfrontPurchaseStatus =
  | "AGREED"
  | "FUNDED"
  | "APPROVED"
  | "AUTO_APPROVED"
  | "PAID"
  | "DISPUTED"
  | "REFUNDED";

export interface UpfrontPurchase {
  id: string;
  priceKobo: number;
  platformFeeKobo: number;
  totalKobo: number;
  status: UpfrontPurchaseStatus;
  fundedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  listing: UpfrontListing;
  review?: UpfrontReview | null;
}

// What a lister sees for a slot sold against their own listing — unlike
// UpfrontPurchase (the buyer's view), the listing here is just its title
// (the lister already knows the rest) and the buyer's identity is what's
// actually new information.
export interface UpfrontSale {
  id: string;
  priceKobo: number;
  totalKobo: number;
  status: UpfrontPurchaseStatus;
  fundedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  listing: { title: string };
  buyer: { name: string; email: string };
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "DEVELOPER" | "CREATOR" | "ADMIN" | "BRAND";
  createdAt: string;
  creatorProfile?: { id: string; handle: string; gateStatus: GateStatus } | null;
  brandProfile?: { id: string; companyName: string } | null;
  developerProfile?: { id: string } | null;
}

export type QuestionTargetType = "CREATOR" | "UPFRONT_LISTING";

export interface Question {
  id: string;
  targetType: QuestionTargetType;
  questionText: string;
  answerText: string | null;
  answeredAt: string | null;
  createdAt: string;
  asker: { name: string };
}

export type NotificationType =
  | "ORDER_UPDATE"
  | "UPFRONT_UPDATE"
  | "CREATOR_REVIEW_STATUS"
  | "LISTING_REVIEW_STATUS"
  | "QUESTION_ASKED"
  | "QUESTION_ANSWERED";

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

export interface SavedCreator {
  id: string;
  createdAt: string;
  creator: CreatorProfile;
}

export interface AnalyticsSummary {
  gmvKobo: number;
  platformFeeKobo: number;
  ordersByStatus: { status: string; count: number }[];
  purchasesByStatus: { status: string; count: number }[];
  usersByRole: { role: string; count: number }[];
  creatorsByGateStatus: { status: string; count: number }[];
  listingsByGateStatus: { status: string; count: number }[];
  totalReviews: number;
  totalQuestions: number;
  answeredQuestions: number;
}
