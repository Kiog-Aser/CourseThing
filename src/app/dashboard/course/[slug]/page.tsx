import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { isAdminEmail } from "~/server/auth/utils/is-admin";
import { CourseManagerClient } from "./_components/CourseManagerClient";

interface PageProps {
  params: { slug: string };
}

export default async function CourseDashboardPage(props: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }
  if (!isAdminEmail(session.user?.email)) {
    redirect("/");
  }

  const slug = props.params.slug;

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
    lessons: course.lessons.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      kind: l.kind,
      status: l.status,
      content: l.content ?? "",
      contentJson: l.contentJson ?? "",
      youtubeId: l.youtubeId ?? "",
      order: l.order,
    })),
  };

  return <CourseManagerClient slug={slug} initialCourse={initialCourse} />;
}
