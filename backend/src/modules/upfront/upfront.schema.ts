import { z } from "zod";

export const createListingSchema = z.object({
  title: z.string().min(1),
  niche: z.string().min(1),
  description: z.string().min(1),
  audienceSummary: z.string().min(1),
  pricePerSlotKobo: z.number().int().positive(),
  totalSlots: z.number().int().positive(),
  programDate: z.coerce.date()
});
export type CreateListingInput = z.infer<typeof createListingSchema>;

export const adminUpdateListingSchema = createListingSchema.partial().extend({
  gateStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional()
});
export type AdminUpdateListingInput = z.infer<typeof adminUpdateListingSchema>;

export const createUpfrontReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().min(1)
});
export type CreateUpfrontReviewInput = z.infer<typeof createUpfrontReviewSchema>;
