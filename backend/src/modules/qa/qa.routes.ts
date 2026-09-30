import { Router } from "express";
import { asyncHandler } from "../../common/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { qaController } from "./qa.controller";
import { answerQuestionSchema, askQuestionSchema } from "./qa.schema";

export const qaRouter = Router();

qaRouter.get("/", requireAuth, asyncHandler(qaController.listForTarget));
qaRouter.post("/", requireAuth, validate(askQuestionSchema), asyncHandler(qaController.ask));
qaRouter.post("/:id/answer", requireAuth, validate(answerQuestionSchema), asyncHandler(qaController.answer));
