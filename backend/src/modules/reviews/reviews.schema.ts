import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().min(1)
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
