import { z } from "zod";

export const createRequestSchema = z.object({
  productId: z.string().uuid(),
  budgetKobo: z.number().int().positive(),
  brief: z.string().min(1),
  nicheTags: z.array(z.string()).min(1),
  deadline: z.coerce.date()
});
export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const adminUpdateRequestSchema = createRequestSchema.partial().extend({
  status: z.enum(["OPEN", "CLOSED"]).optional()
});
export type AdminUpdateRequestInput = z.infer<typeof adminUpdateRequestSchema>;
