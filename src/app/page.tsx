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

  let courses: CourseWithChapters[] = [];
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

  return <HomePageClient initialCourses={courses} isAdmin={isAdmin} isAuthed={isAuthed} />;
}
