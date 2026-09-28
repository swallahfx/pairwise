import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  // ADMIN is deliberately excluded — that role only ever exists on a
  // seeded account, never via public self-registration.
  role: z.enum(["DEVELOPER", "CREATOR", "BRAND"])
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
export type LoginInput = z.infer<typeof loginSchema>;

export const googleAuthSchema = z.object({
  credential: z.string().min(1),
  // Only used the first time this Google email signs in — a brand new
  // account needs a role to know which profile to create. Ignored if the
  // email already has an account.
  role: z.enum(["DEVELOPER", "CREATOR", "BRAND"]).optional()
});
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

// Unlike registerSchema, ADMIN is a legal value here — this is the one
// path an ADMIN account can come from besides the seed script, and it's
// already gated to admin-only callers at the route level.
export const adminCreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["DEVELOPER", "CREATOR", "BRAND", "ADMIN"]),
  // Creator-only fields
  handle: z.string().optional(),
  platform: z.string().optional(),
  followerCount: z.number().int().nonnegative().optional(),
  engagementRate: z.number().min(0).max(1).optional(),
  nicheTags: z.array(z.string()).optional(),
  preApprove: z.boolean().optional(),
  // Brand-only fields
  companyName: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional()
});
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
