import { NextFunction, Request, Response } from "express";
import { AnyZodObject } from "zod";

// Validates req.body against a Zod schema and replaces it with the parsed,
// typed result — so controllers never touch unvalidated input.
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}
