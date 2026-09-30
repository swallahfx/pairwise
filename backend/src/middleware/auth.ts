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

// For public routes that behave differently for a logged-in viewer (e.g.
// hiding rate cards from other creators) without requiring login at all —
// unlike requireAuth, a missing or invalid token just leaves req.auth
// unset rather than rejecting the request.
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.auth = jwt.verify(header.slice("Bearer ".length), env.jwtSecret) as AuthPayload;
    } catch {
      // Invalid/expired token on an optional-auth route — treat as anonymous.
    }
  }
  next();
}

// ADMIN always passes every role gate below — admin accounts are
// provisioned with a real DeveloperProfile/CreatorProfile/BrandProfile
// (see auth.service.ts's adminCreateUser and prisma/seed.ts), so the
// business logic these routes guard (which looks up "the profile for this
// userId") works unmodified for an admin acting through their own linked
// profiles. This is deliberately not a blanket bypass of ownership checks
// elsewhere (assertIsDeveloper/assertIsCreator/assertIsBuyer) — an admin
// can act as a developer or creator, but still only on transactions where
// they're actually the party involved.
export function requireRole(role: AuthPayload["role"]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.auth?.role !== role && req.auth?.role !== "ADMIN") {
      throw new UnauthorizedError(`This action requires a ${role.toLowerCase()} account`);
    }
    next();
  };
}

// For the handful of actions either a creator or a brand can take (listing
// something for sale) — requireRole only ever checks a single role.
export function requireAnyRole(...roles: AuthPayload["role"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || (!roles.includes(req.auth.role) && req.auth.role !== "ADMIN")) {
      throw new UnauthorizedError(`This action requires one of: ${roles.join(", ").toLowerCase()}`);
    }
    next();
  };
}
