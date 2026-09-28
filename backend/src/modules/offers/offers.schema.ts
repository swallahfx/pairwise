import { z } from "zod";

export const sendCustomOfferSchema = z.object({
  creatorId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  priceKobo: z.number().int().positive(),
  deliverable: z.string().min(1)
});
export type SendCustomOfferInput = z.infer<typeof sendCustomOfferSchema>;

export const applyToRequestSchema = z.object({
  priceKobo: z.number().int().positive().optional(),
  deliverable: z.string().min(1)
});
export type ApplyToRequestInput = z.infer<typeof applyToRequestSchema>;
