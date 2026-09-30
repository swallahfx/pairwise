import { z } from "zod";

export const raiseDisputeSchema = z.object({
  reason: z.string().min(10, "Explain what's wrong — at least a sentence, so the other side and an admin can act on it.")
});
export type RaiseDisputeInput = z.infer<typeof raiseDisputeSchema>;

export const respondToDisputeSchema = z.object({
  response: z.string().min(10, "Explain your side — at least a sentence.")
});
export type RespondToDisputeInput = z.infer<typeof respondToDisputeSchema>;
