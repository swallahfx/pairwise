import { z } from "zod";

export const updateBrandProfileSchema = z.object({
  companyName: z.string().min(1),
  website: z.union([z.string().url(), z.literal("")]).optional(),
  industry: z.string().optional()
});
export type UpdateBrandProfileInput = z.infer<typeof updateBrandProfileSchema>;

export const adminUpdateBrandSchema = updateBrandProfileSchema.partial();
export type AdminUpdateBrandInput = z.infer<typeof adminUpdateBrandSchema>;
