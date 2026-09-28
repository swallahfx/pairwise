import { z } from "zod";

export const createRateCardItemSchema = z.object({
  deliverable: z.string().min(1),
  priceKobo: z.number().int().positive(),
  turnaroundDays: z.number().int().positive()
});
export type CreateRateCardItemInput = z.infer<typeof createRateCardItemSchema>;
