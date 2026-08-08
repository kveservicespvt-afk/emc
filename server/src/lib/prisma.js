import { PrismaClient } from "@prisma/client";

// Single shared instance — Prisma manages its own connection pool.
export const prisma = new PrismaClient();
