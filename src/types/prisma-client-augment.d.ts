/**
 * TEMPORARY PRISMA CLIENT AUGMENTATION
 * ------------------------------------
 * Purpose:
 *   Your generated @prisma/client types do not currently expose the model delegates
 *   (course, lesson, etc.) to TypeScript, causing property access errors like:
 *     Property 'course' does not exist on type 'PrismaClient'
 *
 *   This file supplies a minimal, permissive declaration merge so the rest of the
 *   application can type‑check. It intentionally does NOT try to be a full fidelity
 *   replica of Prisma’s generated types. Once the real Prisma types are working
 *   again (i.e. after a successful `prisma generate` that produces model delegate
 *   typings), DELETE this file.
 *
 * Design:
 *   - Only the models & methods actually used in the codebase are declared.
 *   - Return types are broad but structurally useful.
 *   - Generic args (`T`) are accepted and passed through so existing call sites
 *     with `select`/`include` objects do not error, but we do not attempt deep
 *     conditional typing.
 *   - Safe to keep temporarily: declaration merging means if the real delegates
 *     appear later, those richer definitions will override these loose shapes.
 */

import type { PrismaClient as RealPrismaClient } from "@prisma/client"; // Import for side‑effects / merging (will resolve even if incomplete)

declare module "@prisma/client" {
  /* ---------------------------- Model Shape Stubs --------------------------- */

  // Mirror your schema fields that code references; omit relations you don’t touch directly.
  interface Course {
    id: string;
    slug: string;
    title: string;
    language: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    authorId: string;
  }

  interface Lesson {
    id: string;
    slug: string;
    title: string;
    kind: "VIDEO" | "TEXT";
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    content: string | null;
    contentJson?: string | null;
    youtubeId: string | null;
    order: number;
    createdAt: Date;
    updatedAt: Date;
    courseId: string;
    authorId: string;
  }

  interface User {
    id: string;
    email: string | null;
    name: string | null;
    image?: string | null;
    // role column exists in schema but current app logic uses env allow‑list instead.
    role?: "USER" | "ADMIN" | null;
  }

  /* ------------------------------ Arg Shape Stubs --------------------------- */

  // Extremely loose arg generic – only the properties you actively use.
  interface FindManyArgs {
    where?: Record<string, unknown>;
    orderBy?: any;
    select?: any;
  }
  interface FindUniqueArgs {
    where: Record<string, unknown>;
    include?: any;
    select?: any;
  }
  interface CreateArgs {
    data: Record<string, unknown>;
    select?: any;
  }
  interface UpdateArgs {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
    select?: any;
  }
  interface DeleteArgs {
    where: Record<string, unknown>;
  }

  /* ---------------------------- Delegate Interfaces ------------------------- */

  interface CourseDelegate {
    findMany<T extends FindManyArgs = FindManyArgs>(args?: T): Promise<Course[]>;
    findUnique<T extends FindUniqueArgs = FindUniqueArgs>(args: T): Promise<(Course & { lessons?: Lesson[] }) | null>;
    create<T extends CreateArgs = CreateArgs>(args: T): Promise<Course>;
    update<T extends UpdateArgs = UpdateArgs>(args: T): Promise<Course>;
  }

  interface LessonDelegate {
    create<T extends CreateArgs = CreateArgs>(args: T): Promise<Lesson>;
    update<T extends UpdateArgs = UpdateArgs>(args: T): Promise<Lesson>;
    delete<T extends DeleteArgs = DeleteArgs>(args: T): Promise<Lesson>;
  }

  interface UserDelegate {
    findUnique<T extends FindUniqueArgs = FindUniqueArgs>(args: T): Promise<User | null>;
    count<T = any>(args?: T): Promise<number>;
    update<T extends UpdateArgs = UpdateArgs>(args: T): Promise<User>;
  }

  /* -------------------------- PrismaClient Augmentation --------------------- */

  // Merge into the existing PrismaClient interface (if present).
  interface PrismaClient {
    course: CourseDelegate;
    lesson: LessonDelegate;
    user: UserDelegate;
  }

  // Re-export the (augmented) type so importing code can still refer to PrismaClient.
  // (Not required, but convenient if the generated client was incomplete.)
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface AugmentedPrismaClient extends PrismaClient, RealPrismaClient {}
}

/**
 * NOTE: Remove this file once the generated client includes model delegate typings.
 */
