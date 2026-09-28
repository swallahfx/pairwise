import { z } from "zod";

export const askQuestionSchema = z.object({
  targetType: z.enum(["CREATOR", "UPFRONT_LISTING"]),
  targetId: z.string().uuid(),
  questionText: z.string().min(1)
});
export type AskQuestionInput = z.infer<typeof askQuestionSchema>;

export const answerQuestionSchema = z.object({
  answerText: z.string().min(1)
});
export type AnswerQuestionInput = z.infer<typeof answerQuestionSchema>;
