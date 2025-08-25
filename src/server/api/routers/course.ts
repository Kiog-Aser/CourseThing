import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { isAdminEmail } from "~/server/auth/utils/is-admin";

const courseBase = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    // Allow 2+ to stay consistent with lesson slug rule and current UI inputs
    .min(2),
  language: z.string().min(2),
});

const lessonBase = z.object({
  title: z.string().min(2),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(2),
  kind: z.enum(["VIDEO", "TEXT"]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  content: z.string().optional(),
  contentJson: z.string().optional(),
  youtubeId: z.string().optional(),
  order: z.number().int().min(0).default(0),
});

function ensureAdmin(email: string | null | undefined) {
  if (!isAdminEmail(email)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  }
}

export const courseRouter = createTRPCRouter({
  // --- Lesson Completion Endpoints ---
  getLessonCompletions: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Returns an array of lessonIds the current user has completed for this course
      const completions = await ctx.db.lessonCompletion.findMany({
        where: {
          userId: ctx.session.user.id,
          lesson: { courseId: input.courseId },
        },
        select: { lessonId: true },
      });
      return completions.map((c) => c.lessonId);
    }),

  markLessonCompleted: protectedProcedure
    .input(z.object({ lessonId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Upsert to avoid duplicates
      await ctx.db.lessonCompletion.upsert({
        where: {
          userId_lessonId: {
            userId: ctx.session.user.id,
            lessonId: input.lessonId,
          },
        },
        update: {},
        create: {
          userId: ctx.session.user.id,
          lessonId: input.lessonId,
        },
      });
      return { success: true };
    }),

  unmarkLessonCompleted: protectedProcedure
    .input(z.object({ lessonId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.lessonCompletion.deleteMany({
        where: {
          userId: ctx.session.user.id,
          lessonId: input.lessonId,
        },
      });
      return { success: true };
    }),

  // --- Existing Endpoints ---
  list: publicProcedure.query(async ({ ctx }) => {
    try {
      // Primary path: DB has the language column
      return await ctx.db.course.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          language: true,
        },
      });
    } catch (_err) {
      // Fallback path: older database without the language column
      const fallback = await ctx.db.course.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
        },
      });
      return fallback.map(
        (c: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
        }) => ({
          ...c,
          language: "general",
        }),
      );
    }
  }),
  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.course.findUnique({
        where: { slug: input.slug },
        include: { lessons: { orderBy: { order: "asc" } } },
      }),
    ),
  create: protectedProcedure
    .input(courseBase)
    .mutation(async ({ ctx, input }) => {
      ensureAdmin(ctx.session.user?.email);
      try {
        return await ctx.db.course.create({
          data: { ...input, authorId: ctx.session.user.id },
        });
      } catch (err) {
        const msg = (err as Error)?.message || "";
        // Handle legacy database missing the language column. Different providers /
        // Prisma versions produce slightly different error messages, so we
        // check a few substrings instead of only one.
        const missingLanguage =
          /Course\.language|`language` does not exist|Unknown column 'language'/i.test(
            msg,
          );
        if (missingLanguage) {
          // Fallback: older DB without language column
          const created = await ctx.db.course.create({
            data: {
              // omit language (column does not exist)
              title: input.title,
              description: input.description,
              slug: input.slug,
              authorId: ctx.session.user.id,
            },
          });
          return { ...created, language: "general" };
        }
        throw err;
      }
    }),
  update: protectedProcedure
    .input(courseBase.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      ensureAdmin(ctx.session.user?.email);
      try {
        return await ctx.db.course.update({
          where: { id: input.id },
          data: {
            title: input.title,
            description: input.description,
            slug: input.slug,
            language: input.language,
          },
        });
      } catch (err) {
        const msg = (err as Error)?.message || "";
        const missingLanguage =
          /Course\.language|`language` does not exist|Unknown column 'language'/i.test(
            msg,
          );
        if (missingLanguage) {
          // Fallback: update without language column present
          const updated = await ctx.db.course.update({
            where: { id: input.id },
            data: {
              title: input.title,
              description: input.description,
              slug: input.slug,
              // omit language
            } as Record<string, unknown>,
          });
          return { ...updated, language: "general" };
        }
        throw err;
      }
    }),
  addLesson: protectedProcedure
    .input(z.object({ courseId: z.string(), data: lessonBase }))
    .mutation(async ({ ctx, input }) => {
      ensureAdmin(ctx.session.user?.email);
      return ctx.db.lesson.create({
        data: {
          ...input.data,
          courseId: input.courseId,
          authorId: ctx.session.user.id,
        },
      });
    }),
  updateLesson: protectedProcedure
    .input(z.object({ id: z.string(), data: lessonBase.partial() }))
    .mutation(async ({ ctx, input }) => {
      ensureAdmin(ctx.session.user?.email);
      return ctx.db.lesson.update({
        where: { id: input.id },
        data: input.data,
      });
    }),
  deleteLesson: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      ensureAdmin(ctx.session.user?.email);
      await ctx.db.lesson.delete({ where: { id: input.id } });
      return { success: true };
    }),
  deleteCourse: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      ensureAdmin(ctx.session.user?.email);
      try {
        await ctx.db.course.delete({ where: { id: input.id } });
      } catch {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }
      return { success: true };
    }),
});
