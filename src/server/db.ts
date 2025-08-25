import { PrismaClient } from "@prisma/client";
import { env } from "~/env";

const createPrismaClient = () =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Temporary widened cast so TypeScript sees delegate properties (course, lesson, user)
 * even if the generated Prisma type declarations are currently missing them.
 * Remove this cast (and the augmentation file) once `prisma generate` produces
 * full model delegate typings again.
 */
export const db = (globalForPrisma.prisma ??
  createPrismaClient()) as PrismaClient;

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
