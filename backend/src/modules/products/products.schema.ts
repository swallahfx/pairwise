import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1),
  niche: z.string().min(1),
  link: z.string().url(),
  pitch: z.string().min(1),
  monetizationStatus: z.enum(["PRE_REVENUE", "EARLY_REVENUE", "ESTABLISHED"]),
  mrrKobo: z.number().int().nonnegative().optional(),
  activeUsers: z.number().int().nonnegative().optional()
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const adminUpdateProductSchema = createProductSchema.partial();
export type AdminUpdateProductInput = z.infer<typeof adminUpdateProductSchema>;
