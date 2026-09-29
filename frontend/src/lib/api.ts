const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pairwize_token") : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

type Role = "DEVELOPER" | "CREATOR" | "ADMIN" | "BRAND";

type AuthResponse = {
  token: string;
  userId: string;
  role: Role;
  name: string;
  email: string;
};

export const api = {
  auth: {
    register: (data: { email: string; password: string; name: string; role: "DEVELOPER" | "CREATOR" | "BRAND" }) =>
      request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    google: (data: { credential: string; role?: "DEVELOPER" | "CREATOR" | "BRAND" }) =>
      request<AuthResponse>("/auth/google", { method: "POST", body: JSON.stringify(data) }),
    adminCreateUser: (data: {
      email: string;
      password: string;
      name: string;
      role: Role;
      handle?: string;
      platform?: string;
      followerCount?: number;
      engagementRate?: number;
      nicheTags?: string[];
      preApprove?: boolean;
      companyName?: string;
      website?: string;
      industry?: string;
    }) =>
      request<{ id: string; email: string; name: string; role: Role }>("/auth/admin/create-user", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    adminListUsers: () => request<import("@/types").AdminUser[]>("/auth/admin/users"),
    adminDeleteUser: (id: string) => request<void>(`/auth/admin/users/${id}`, { method: "DELETE" })
  },
  creators: {
    list: (params: { niche?: string; sort?: string } = {}) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<import("@/types").CreatorProfile[]>(`/creators${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<import("@/types").CreatorProfile>(`/creators/${id}`),
    getMe: () => request<import("@/types").CreatorProfile>("/creators/me"),
    updateMe: (data: {
      handle: string;
      platform: string;
      followerCount: number;
      engagementRate: number;
      nicheTags: string[];
    }) => request<import("@/types").CreatorProfile>("/creators/me", { method: "PUT", body: JSON.stringify(data) }),
    listPendingReview: () => request<import("@/types").CreatorProfile[]>("/creators/admin/pending"),
    approve: (id: string) =>
      request<import("@/types").CreatorProfile>(`/creators/admin/${id}/approve`, { method: "POST" }),
    reject: (id: string) =>
      request<import("@/types").CreatorProfile>(`/creators/admin/${id}/reject`, { method: "POST" }),
    adminListAll: () => request<import("@/types").CreatorProfile[]>("/creators/admin/all"),
    adminUpdate: (id: string, data: Record<string, unknown>) =>
      request<import("@/types").CreatorProfile>(`/creators/admin/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
    adminDelete: (id: string) => request<void>(`/creators/admin/${id}`, { method: "DELETE" }),
    save: (id: string) => request<void>(`/creators/${id}/save`, { method: "POST" }),
    unsave: (id: string) => request<void>(`/creators/${id}/save`, { method: "DELETE" }),
    listSaved: () => request<import("@/types").SavedCreator[]>("/creators/saved/mine")
  },
  rateCards: {
    create: (data: { deliverable: string; priceKobo: number; turnaroundDays: number }) =>
      request("/rate-card-items", { method: "POST", body: JSON.stringify(data) }),
    remove: (itemId: string) => request(`/rate-card-items/${itemId}`, { method: "DELETE" })
  },
  products: {
    list: () => request<import("@/types").Product[]>("/products"),
    get: (id: string) => request<import("@/types").Product>(`/products/${id}`),
    create: (data: Record<string, unknown>) =>
      request("/products", { method: "POST", body: JSON.stringify(data) }),
    adminUpdate: (id: string, data: Record<string, unknown>) =>
      request<import("@/types").Product>(`/products/admin/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
    adminDelete: (id: string) => request<void>(`/products/admin/${id}`, { method: "DELETE" })
  },
  requests: {
    list: () => request<import("@/types").AdvertRequest[]>("/requests"),
    mine: () => request<import("@/types").AdvertRequest[]>("/requests/mine"),
    create: (data: Record<string, unknown>) =>
      request("/requests", { method: "POST", body: JSON.stringify(data) }),
    adminListAll: () => request<import("@/types").AdvertRequest[]>("/requests/admin/all"),
    adminUpdate: (id: string, data: Record<string, unknown>) =>
      request<import("@/types").AdvertRequest>(`/requests/admin/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
    adminDelete: (id: string) => request<void>(`/requests/admin/${id}`, { method: "DELETE" })
  },
  offers: {
    bookRateCard: (rateCardItemId: string) =>
      request<{ offer: unknown; order: import("@/types").Order }>("/offers/book-rate-card", {
        method: "POST",
        body: JSON.stringify({ rateCardItemId })
      }),
    sendCustom: (data: { creatorId: string; productId?: string; priceKobo: number; deliverable: string }) =>
      request<import("@/types").Offer>("/offers/custom", { method: "POST", body: JSON.stringify(data) }),
    applyToRequest: (requestId: string, deliverable: string, priceKobo?: number) =>
      request(`/offers/requests/${requestId}/apply`, {
        method: "POST",
        body: JSON.stringify({ deliverable, priceKobo })
      }),
    listApplicants: (requestId: string) =>
      request<import("@/types").Applicant[]>(`/offers/requests/${requestId}/applicants`),
    mine: () => request<import("@/types").Offer[]>("/offers/mine"),
    accept: (offerId: string) =>
      request<{ offer: import("@/types").Offer; order: import("@/types").Order }>(`/offers/${offerId}/accept`, {
        method: "POST"
      }),
    decline: (offerId: string) => request(`/offers/${offerId}/decline`, { method: "POST" })
  },
  orders: {
    get: (id: string) => request<import("@/types").Order>(`/orders/${id}`),
    mine: () => request<import("@/types").Order[]>("/orders/mine"),
    fund: (id: string) => request<{ authorizationUrl: string }>(`/orders/${id}/fund`, { method: "POST" }),
    start: (id: string) => request<import("@/types").Order>(`/orders/${id}/start`, { method: "POST" }),
    submit: (id: string) => request<import("@/types").Order>(`/orders/${id}/submit`, { method: "POST" }),
    requestRevision: (id: string) =>
      request<import("@/types").Order>(`/orders/${id}/request-revision`, { method: "POST" }),
    approve: (id: string) => request<import("@/types").Order>(`/orders/${id}/approve`, { method: "POST" }),
    adminListAll: () => request<import("@/types").Order[]>("/orders/admin/all"),
    adminDispute: (id: string) => request<import("@/types").Order>(`/orders/admin/${id}/dispute`, { method: "POST" }),
    adminRefund: (id: string) => request<import("@/types").Order>(`/orders/admin/${id}/refund`, { method: "POST" })
  },
  payments: {
    listBanks: () => request<{ name: string; code: string; slug: string }[]>("/payments/banks"),
    resolveAccount: (data: { accountNumber: string; bankCode: string }) =>
      request<{ accountName: string }>("/payments/resolve-account", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    savePayoutAccount: (data: { accountNumber: string; bankCode: string }) =>
      request<import("@/types").CreatorProfile | import("@/types").BrandProfile>("/payments/payout-account", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    verify: (reference: string) => request<unknown>(`/payments/verify/${reference}`)
  },
  reviews: {
    create: (orderId: string, data: { rating: number; text: string }) =>
      request(`/reviews/orders/${orderId}`, { method: "POST", body: JSON.stringify(data) }),
    listForCreator: (creatorId: string) =>
      request<import("@/types").CreatorReviews>(`/reviews/creators/${creatorId}`)
  },
  brands: {
    getMe: () => request<import("@/types").BrandProfile>("/brands/me"),
    updateMe: (data: { companyName: string; website?: string; industry?: string }) =>
      request<import("@/types").BrandProfile>("/brands/me", { method: "PUT", body: JSON.stringify(data) }),
    adminListAll: () => request<import("@/types").BrandProfile[]>("/brands/admin/all"),
    adminUpdate: (id: string, data: Record<string, unknown>) =>
      request<import("@/types").BrandProfile>(`/brands/admin/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
    adminDelete: (id: string) => request<void>(`/brands/admin/${id}`, { method: "DELETE" })
  },
  upfront: {
    list: (niche?: string) =>
      request<import("@/types").UpfrontListing[]>(`/upfront${niche ? `?niche=${encodeURIComponent(niche)}` : ""}`),
    get: (id: string) => request<import("@/types").UpfrontListing>(`/upfront/${id}`),
    mine: () => request<import("@/types").UpfrontListing[]>("/upfront/mine"),
    mySales: () => request<import("@/types").UpfrontSale[]>("/upfront/mine/sales"),
    create: (data: {
      title: string;
      niche: string;
      description: string;
      audienceSummary: string;
      pricePerSlotKobo: number;
      totalSlots: number;
      programDate: string;
    }) => request<import("@/types").UpfrontListing>("/upfront", { method: "POST", body: JSON.stringify(data) }),
    listPendingReview: () => request<import("@/types").UpfrontListing[]>("/upfront/admin/pending"),
    approve: (id: string) =>
      request<import("@/types").UpfrontListing>(`/upfront/admin/${id}/approve`, { method: "POST" }),
    reject: (id: string) =>
      request<import("@/types").UpfrontListing>(`/upfront/admin/${id}/reject`, { method: "POST" }),
    buy: (id: string) => request<import("@/types").UpfrontPurchase>(`/upfront/${id}/buy`, { method: "POST" }),
    adminListAllListings: () => request<import("@/types").UpfrontListing[]>("/upfront/admin/listings"),
    adminUpdateListing: (id: string, data: Record<string, unknown>) =>
      request<import("@/types").UpfrontListing>(`/upfront/admin/listings/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
    adminDeleteListing: (id: string) => request<void>(`/upfront/admin/listings/${id}`, { method: "DELETE" }),
    adminListAllPurchases: () => request<import("@/types").UpfrontPurchase[]>("/upfront/admin/purchases"),
    purchases: {
      mine: () => request<import("@/types").UpfrontPurchase[]>("/upfront/purchases/mine"),
      get: (id: string) => request<import("@/types").UpfrontPurchase>(`/upfront/purchases/${id}`),
      fund: (id: string) =>
        request<{ authorizationUrl: string }>(`/upfront/purchases/${id}/fund`, { method: "POST" }),
      approve: (id: string) =>
        request<import("@/types").UpfrontPurchase>(`/upfront/purchases/${id}/approve`, { method: "POST" }),
      adminDispute: (id: string) =>
        request<import("@/types").UpfrontPurchase>(`/upfront/admin/purchases/${id}/dispute`, { method: "POST" }),
      adminRefund: (id: string) =>
        request<import("@/types").UpfrontPurchase>(`/upfront/admin/purchases/${id}/refund`, { method: "POST" }),
      review: (id: string, data: { rating: number; text: string }) =>
        request<import("@/types").UpfrontReview>(`/upfront/purchases/${id}/review`, {
          method: "POST",
          body: JSON.stringify(data)
        })
    }
  },
  qa: {
    listForTarget: (targetType: import("@/types").QuestionTargetType, targetId: string) =>
      request<import("@/types").Question[]>(`/qa?targetType=${targetType}&targetId=${targetId}`),
    ask: (data: { targetType: import("@/types").QuestionTargetType; targetId: string; questionText: string }) =>
      request<import("@/types").Question>("/qa", { method: "POST", body: JSON.stringify(data) }),
    answer: (id: string, answerText: string) =>
      request<import("@/types").Question>(`/qa/${id}/answer`, {
        method: "POST",
        body: JSON.stringify({ answerText })
      })
  },
  notifications: {
    mine: () => request<import("@/types").NotificationsResponse>("/notifications/mine"),
    markRead: (id: string) => request<void>(`/notifications/${id}/read`, { method: "POST" }),
    markAllRead: () => request<void>("/notifications/read-all", { method: "POST" })
  },
  analytics: {
    summary: () => request<import("@/types").AnalyticsSummary>("/analytics/summary")
  }
};
