import Link from "next/link";
import { db } from "~/server/db";
import { auth } from "~/server/auth";
import { isAdminEmail } from "~/server/auth/utils/is-admin";

type CourseCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  language: string;
};

function groupByLanguage(courses: CourseCard[]) {
  const map = new Map<string, CourseCard[]>();
  for (const c of courses) {
    const lang = c.language?.trim() || "unknown";
    if (!map.has(lang)) map.set(lang, []);
    map.get(lang)!.push(c);
  }
  const entries = Array.from(map.entries()).sort(([a], [b]) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  return entries;
}

export const revalidate = 0; // always fresh for now

export default async function HomePage() {
  const session = await auth();
  const isAdmin = isAdminEmail(session?.user?.email);

  // Fallback logic: try ordering by language; if the column doesn't exist yet (old migration),
  // retry without it and supply a default 'general' language.
  let courses: CourseCard[] = [];
  try {
    courses = (await db.course.findMany({
      orderBy: [{ language: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        language: true,
      },
    })) as CourseCard[];
  } catch (_err) {
    // Retry without language column (likely migration not applied yet)
    const fallback = await db.course.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
      },
    });
    courses = fallback.map((c: (typeof fallback)[number]) => ({
      ...c,
      language: "general",
    })) as CourseCard[];
  }

  const grouped = groupByLanguage(courses);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learn Languages</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Browse available courses grouped by language. Pick one and start
            learning.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/learn"
            className="hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium"
          >
            Go to Learn
          </Link>
          {isAdmin && (
            <Link
              href="/dashboard"
              className="bg-primary text-primary-foreground rounded-md border px-4 py-2 text-sm font-medium shadow hover:opacity-90"
            >
              Admin
            </Link>
          )}
        </div>
      </header>

      {grouped.length === 0 && (
        <div className="bg-muted/40 rounded-md border p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No courses have been created yet.
          </p>
          {isAdmin && (
            <p className="mt-2 text-xs">
              Visit the{" "}
              <Link
                href="/dashboard"
                className="hover:text-foreground underline underline-offset-2"
              >
                admin dashboard
              </Link>{" "}
              to create the first one.
            </p>
          )}
        </div>
      )}

      <div className="space-y-12">
        {grouped.map(([language, list]) => (
          <section key={language}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-tight">
                {language.charAt(0).toUpperCase() + language.slice(1)}
              </h2>
              <span className="text-muted-foreground text-xs font-medium">
                {list.length} course{list.length !== 1 && "s"}
              </span>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((course) => (
                <li
                  key={course.id}
                  className="group bg-background relative flex flex-col overflow-hidden rounded-lg border shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="mb-1 line-clamp-2 text-sm leading-snug font-semibold">
                      {course.title}
                    </h3>
                    <p className="text-muted-foreground mb-4 line-clamp-3 text-xs leading-relaxed">
                      {course.description ?? "No description provided."}
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="bg-muted rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                        {course.language}
                      </span>
                      <Link
                        href={`/learn?course=${encodeURIComponent(course.slug)}`}
                        className="text-primary text-xs font-medium underline-offset-4 hover:underline"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                  <div className="absolute inset-0 -z-10 opacity-0 transition group-hover:opacity-100" />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
