import { z } from "zod";

export const updateCreatorProfileSchema = z.object({
  handle: z.string().min(1),
  platform: z.string().min(1),
  followerCount: z.number().int().nonnegative(),
  engagementRate: z.number().min(0).max(1),
  nicheTags: z.array(z.string()).min(1)
});
export type UpdateCreatorProfileInput = z.infer<typeof updateCreatorProfileSchema>;

// Unlike updateCreatorProfileSchema (self-service, always re-runs the
// eligibility gate), an admin can set every field directly — including
// gateStatus itself — without the gate's automatic PENDING/REJECTED logic
// kicking in. Every field's optional so a PATCH can touch just one.
export const adminUpdateCreatorSchema = z.object({
  handle: z.string().min(1).optional(),
  platform: z.string().min(1).optional(),
  followerCount: z.number().int().nonnegative().optional(),
  engagementRate: z.number().min(0).max(1).optional(),
  nicheTags: z.array(z.string()).min(1).optional(),
  gateStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional()
});
export type AdminUpdateCreatorInput = z.infer<typeof adminUpdateCreatorSchema>;

export const listCreatorsQuerySchema = z.object({
  niche: z.string().optional(),
  sort: z.enum(["price_asc", "price_desc"]).optional()
});
export type ListCreatorsQuery = z.infer<typeof listCreatorsQuerySchema>;
