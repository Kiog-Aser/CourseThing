import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { isAdminEmail } from "~/server/auth/utils/is-admin";
import { CourseSettingsClient } from "./_components/CourseSettingsClient";

export default async function CourseSettingsPage({
  params,
}: {
  params: { slug: string };
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }
  if (!isAdminEmail(session.user?.email)) {
    redirect("/");
  }

  const slug = params.slug;

  const course = await db.course.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      language: true,
      description: true,
      poster: true,
      audience: true,
      createdAt: true,
      updatedAt: true,
      authorId: true,
    },
  });

  if (!course) {
    redirect("/dashboard");
  }

  return <CourseSettingsClient initialCourse={course} />;
}
