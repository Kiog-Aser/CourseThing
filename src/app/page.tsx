import Link from "next/link";
import { db } from "~/server/db";
import { auth } from "~/server/auth";
import { isAdminEmail } from "~/server/auth/utils/is-admin";
import { BookOpen, ArrowRight, Lock } from "lucide-react";

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
  return Array.from(map.entries()).sort(([a], [b]) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

export const revalidate = 0;

export default async function HomePage() {
  const session = await auth();
  const isAdmin = isAdminEmail(session?.user?.email);
  const isAuthed = !!session?.user;

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
  } catch {
    const fallback = await db.course.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, slug: true, title: true, description: true },
    });
    courses = fallback.map((c: (typeof fallback)[number]) => ({
      ...c,
      language: "general",
    })) as CourseCard[];
  }

  const grouped = groupByLanguage(courses);

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      {/* Hero */}
      <section className="from-primary/10 via-primary/5 relative mb-14 overflow-hidden rounded-2xl border bg-gradient-to-br to-transparent p-10">
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="bg-background/70 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide backdrop-blur">
            <BookOpen size={14} />
            <span>Practical, free first lessons</span>
          </div>
          <h1 className="text-4xl leading-tight font-bold tracking-tight text-balance md:text-5xl">
            Master languages, one bite‑sized lesson at a time
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            The first lesson of every course is unlocked. Sign in (free) to
            continue with the rest of each course and track your progress.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="#courses"
              className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-medium shadow transition hover:brightness-110"
            >
              Browse Courses <ArrowRight size={16} />
            </Link>
            {isAuthed ? (
              <Link
                href="/learn"
                className="hover:bg-accent inline-flex items-center gap-2 rounded-md border px-5 py-3 text-sm font-medium"
              >
                Continue Learning
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="hover:bg-accent inline-flex items-center gap-2 rounded-md border px-5 py-3 text-sm font-medium"
                >
                  Create Free Account
                </Link>
                <Link
                  href="/signin"
                  className="text-muted-foreground inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
                >
                  Sign In
                </Link>
              </>
            )}
            {isAdmin && (
              <Link
                href="/dashboard"
                className="hover:bg-accent/60 inline-flex items-center gap-2 rounded-md border px-5 py-3 text-sm font-medium"
              >
                Admin
              </Link>
            )}
          </div>
          {!isAuthed && (
            <p className="text-muted-foreground/80 text-xs">
              You are viewing as a guest. Lessons after #1 will ask you to sign
              in.
            </p>
          )}
        </div>
        <div className="pointer-events-none absolute inset-0">
          <div className="bg-primary/20 absolute -top-20 -right-20 h-72 w-72 rounded-full blur-3xl" />
          <div className="bg-primary/10 absolute bottom-[-4rem] left-[-2rem] h-80 w-80 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Empty state */}
      {grouped.length === 0 && (
        <div className="bg-muted/40 rounded-xl border p-10 text-center">
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

      {/* Course Groups */}
      <div id="courses" className="space-y-16">
        {grouped.map(([language, list]) => (
          <section key={language} className="scroll-mt-24">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  {language.charAt(0).toUpperCase() + language.slice(1)}
                </h2>
                <p className="text-muted-foreground mt-1 text-xs">
                  {list.length} course{list.length !== 1 && "s"}
                </p>
              </div>
            </div>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((course) => {
                return (
                  <li key={course.id}>
                    <Link
                      href={`/learn?course=${encodeURIComponent(course.slug)}`}
                      className="group bg-card ring-offset-background hover:border-primary/40 focus-visible:ring-primary/50 relative flex h-full flex-col overflow-hidden rounded-xl border p-5 shadow-sm transition hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <div className="absolute inset-0 -z-10 opacity-0 transition duration-300 group-hover:opacity-100">
                        <div className="from-primary/10 absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />
                      </div>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="bg-muted/70 text-foreground/80 rounded px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                          {course.language}
                        </span>
                        {!isAuthed && (
                          <span className="text-muted-foreground/60 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium">
                            <Lock size={12} />
                            After lesson 1
                          </span>
                        )}
                      </div>
                      <h3 className="mb-2 line-clamp-2 text-sm leading-snug font-semibold tracking-tight">
                        {course.title}
                      </h3>
                      <p className="text-muted-foreground mb-5 line-clamp-3 text-xs leading-relaxed">
                        {course.description ?? "No description provided."}
                      </p>
                      <div className="mt-auto flex items-center justify-between text-xs font-medium">
                        <span className="text-primary inline-flex items-center gap-1">
                          Open{" "}
                          <ArrowRight
                            size={14}
                            className="transition group-hover:translate-x-0.5"
                          />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
