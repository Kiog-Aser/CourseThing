import Link from "next/link";
import { db } from "~/server/db";
import { auth } from "~/server/auth";
import { isAdminEmail } from "~/server/auth/utils/is-admin";
import { BookOpen, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { CoursePosterCard } from "~/components/CoursePosterCard";
import HomePageClient from "./HomePageClient";

type CourseWithChapters = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  language: string;
  poster: string | null;
  chapters: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    poster: string | null;
    order: number;
    lessons: Array<{
      id: string;
      title: string;
      description: string | null;
    }>;
  }>;
  lessons: Array<{
    id: string;
    title: string;
    description: string | null;
  }>;
};

export const revalidate = 0;

export default async function HomePage() {
  const session = await auth();
  const isAdmin = isAdminEmail(session?.user?.email);
  const isAuthed = !!session?.user;
  const isCreatiFunCustomer = session?.user?.creativeFunSubscription === true;

  let courses: CourseWithChapters[] = [];
  let continueCourseSlug: string | null = null;

  try {
    courses = await db.course.findMany({
      orderBy: [{ language: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        language: true,
        poster: true,
        audience: true,
        chapters: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            poster: true,
            order: true,
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                description: true,
              },
            },
          },
        },
        lessons: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    // If user is authenticated, find the course and lesson they should continue with
    if (isAuthed && session?.user?.id) {
      // Get all lessons with completion status for this user
      const lessonsWithCompletion = await db.lesson.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { courseId: { not: null } },
            { chapterId: { not: null } }
          ]
        },
        select: {
          id: true,
          order: true,
          courseId: true,
          chapterId: true,
          course: {
            select: {
              id: true,
              slug: true,
            },
          },
          chapter: {
            select: {
              id: true,
              courseId: true,
              course: {
                select: {
                  slug: true,
                },
              },
            },
          },
          lessonCompletions: {
            where: { userId: session.user.id },
            select: { id: true },
          },
        },
        orderBy: [
          { courseId: "asc" },
          { chapterId: "asc" },
          { order: "asc" }
        ],
      });

      // Group lessons by course
      const courseLessons = new Map<string, typeof lessonsWithCompletion>();

      lessonsWithCompletion.forEach(lesson => {
        const courseId = lesson.courseId || lesson.chapter?.courseId;
        if (courseId) {
          const courseSlug = lesson.course?.slug || lesson.chapter?.course?.slug;
          if (courseSlug) {
            if (!courseLessons.has(courseId)) {
              courseLessons.set(courseId, []);
            }
            courseLessons.get(courseId)!.push(lesson);
          }
        }
      });

      // Find the first incomplete lesson across all courses
      for (const [courseId, lessons] of courseLessons) {
        // Sort lessons by order to find the next incomplete one
        const sortedLessons = lessons.sort((a, b) => a.order - b.order);

        for (const lesson of sortedLessons) {
          // If this lesson is not completed, it's the next one to do
          if (lesson.lessonCompletions.length === 0) {
            const courseSlug = lesson.course?.slug || lesson.chapter?.course?.slug;
            if (courseSlug) {
              continueCourseSlug = `${courseSlug}?lesson=${lesson.id}`;
              break;
            }
          }
        }

        if (continueCourseSlug) break;
      }

      // If no incomplete lessons found, fall back to the course with the most recent completion
      if (!continueCourseSlug && lessonsWithCompletion.length > 0) {
        const mostRecentCompletion = lessonsWithCompletion
          .filter(lesson => lesson.lessonCompletions.length > 0)
          .sort((a, b) => {
            const aCompletion = a.lessonCompletions[0];
            const bCompletion = b.lessonCompletions[0];
            if (!aCompletion || !bCompletion) return 0;
            return new Date(bCompletion.completedAt || 0).getTime() - new Date(aCompletion.completedAt || 0).getTime();
          })[0];

        if (mostRecentCompletion) {
          const courseSlug = mostRecentCompletion.course?.slug || mostRecentCompletion.chapter?.course?.slug;
          if (courseSlug) {
            continueCourseSlug = courseSlug;
          }
        }
      }
    }
  } catch {
    // Fallback for older database schema without poster and chapters
    const fallback = await db.course.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, slug: true, title: true, description: true },
    });
    courses = fallback.map((c: (typeof fallback)[number]) => ({
      ...c,
      language: "general",
      poster: null,
      chapters: [],
      lessons: [],
    }));
  }

  return (
    <HomePageClient
      initialCourses={courses}
      isAdmin={isAdmin}
      isAuthed={isAuthed}
      isCreatiFunCustomer={isCreatiFunCustomer}
      continueCourseSlug={continueCourseSlug}
    />
  );
}
