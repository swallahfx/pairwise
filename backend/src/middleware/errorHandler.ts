import { NextFunction, Request, Response } from "express";
import { AppError } from "../common/errors";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "ValidationError",
      details: err.flatten()
    });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.name, message: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "InternalError", message: "Something went wrong" });
}
