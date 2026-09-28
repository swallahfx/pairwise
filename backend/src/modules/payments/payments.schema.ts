import { z } from "zod";

// Nigerian NUBAN account numbers are always 10 digits.
export const resolveAccountSchema = z.object({
  accountNumber: z.string().length(10),
  bankCode: z.string().min(1)
});
export type ResolveAccountInput = z.infer<typeof resolveAccountSchema>;

export const savePayoutAccountSchema = z.object({
  accountNumber: z.string().length(10),
  bankCode: z.string().min(1)
});
export type SavePayoutAccountInput = z.infer<typeof savePayoutAccountSchema>;
