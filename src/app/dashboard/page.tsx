import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import React from "react";
import { AdminDashboardClient } from "./_components/AdminDashboardClient";
import { isAdminEmail } from "~/server/auth/utils/is-admin";

// Server component wrapper enforcing admin access
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }
  if (!isAdminEmail(session.user?.email)) {
    redirect("/");
  }

  // Optionally fetch some initial data on the server
  let courses: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    language: string;
  }[];
  try {
    courses = await (
      db as unknown as { course: { findMany: typeof db.course.findMany } }
    ).course.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        language: true,
      },
    });
  } catch {
    const fallback: Array<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
    }> = await (
      db as unknown as { course: { findMany: typeof db.course.findMany } }
    ).course.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
      },
    });
    courses = fallback.map((c) => ({ ...c, language: "general" })) as {
      id: string;
      slug: string;
      title: string;
      description: string | null;
      language: string;
    }[];
  }

  return <AdminDashboardClient initialCourses={courses} />;
}
