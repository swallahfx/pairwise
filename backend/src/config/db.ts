import { PrismaClient } from "@prisma/client";

// Single shared Prisma client. Every repository imports this rather than
// instantiating its own client, so connection pooling stays sane.
export const prisma = new PrismaClient();
