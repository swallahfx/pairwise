import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UnauthorizedError } from "../common/errors";

export interface AuthPayload {
  userId: string;
  role: "DEVELOPER" | "CREATOR" | "ADMIN" | "BRAND";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing bearer token");
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}

export function requireRole(role: AuthPayload["role"]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.auth?.role !== role) {
      throw new UnauthorizedError(`This action requires a ${role.toLowerCase()} account`);
    }
    next();
  };
}

// For the handful of actions either a creator or a brand can take (listing
// something for sale) — requireRole only ever checks a single role.
export function requireAnyRole(...roles: AuthPayload["role"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      throw new UnauthorizedError(`This action requires one of: ${roles.join(", ").toLowerCase()}`);
    }
    next();
  };
}
