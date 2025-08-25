import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { isAdminEmail } from "~/server/auth/utils/is-admin";
import { CourseManagerClient } from "./_components/CourseManagerClient";

// No custom PageProps needed!
export default async function CourseDashboardPage({
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
    include: { lessons: { orderBy: { order: "asc" } } },
  });

  if (!course) {
    redirect("/dashboard");
  }

  const initialCourse = {
    id: course.id,
    slug: course.slug,
    title: course.title,
    language: course.language,
    description: course.description ?? "",
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    authorId: course.authorId,
    lessons: course.lessons.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      description: l.description,
      kind: l.kind,
      status: l.status,
      content: l.content,
      contentJson: l.contentJson,
      youtubeId: l.youtubeId,
      order: l.order,
      authorId: l.authorId,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    })),
  };

  return <CourseManagerClient slug={slug} initialCourse={initialCourse} />;
}
