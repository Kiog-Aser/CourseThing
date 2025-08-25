"use client";

import Link from "next/link";
import { BookOpen, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { CoursePosterCard } from "~/components/CoursePosterCard";
import { useState } from "react";

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

function groupByLanguage(courses: CourseWithChapters[]) {
  const map = new Map<string, CourseWithChapters[]>();
  for (const c of courses) {
    const lang = c.language?.trim() || "unknown";
    if (!map.has(lang)) map.set(lang, []);
    map.get(lang)!.push(c);
  }
  return Array.from(map.entries()).sort(([a], [b]) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

interface HomePageClientProps {
  initialCourses: CourseWithChapters[];
  isAdmin: boolean;
  isAuthed: boolean;
}

export default function HomePageClient({
  initialCourses,
  isAdmin,
  isAuthed,
}: HomePageClientProps) {
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(
    new Set(),
  );
  const [courses] = useState<CourseWithChapters[]>(initialCourses);

  const grouped = groupByLanguage(courses);

  const toggleCourseExpansion = (courseId: string) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId);
    } else {
      newExpanded.add(courseId);
    }
    setExpandedCourses(newExpanded);
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      {/* Hero */}
      <section className="from-primary/10 via-primary/5 relative mb-8 overflow-hidden rounded-2xl border bg-gradient-to-br to-transparent p-10">
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="bg-background/70 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide backdrop-blur">
            <BookOpen size={14} />
            <span>Creative learning platform</span>
          </div>
          <h1 className="text-4xl leading-tight font-bold tracking-tight text-balance md:text-5xl">
            Unlock your creativity through engaging, interactive courses
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Experience the first lesson of every course for free. Join our
            community of creative minds and track your progress as you build
            new skills step by step.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => {
                const coursesSection = document.getElementById('courses');
                coursesSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-medium shadow transition hover:brightness-110"
            >
              Browse Courses <ArrowRight size={16} />
            </button>
            {isAuthed ? (
              courses.length > 0 ? (
                <Link
                  href={`/learn?course=${courses[0].slug}`}
                  className="hover:bg-accent inline-flex items-center gap-2 rounded-md border px-5 py-3 text-sm font-medium"
                >
                  Continue Learning
                </Link>
              ) : (
                <button
                  onClick={() => {
                    const coursesSection = document.getElementById('courses');
                    coursesSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="hover:bg-accent inline-flex items-center gap-2 rounded-md border px-5 py-3 text-sm font-medium"
                >
                  Browse Courses
                </button>
              )
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

      {/* Expandable Course Sections */}
      <div id="courses" className="mt-12 space-y-16">
        {grouped.map(([language, courseList]) => (
          <section key={language} className="scroll-mt-24">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {language.charAt(0).toUpperCase() + language.slice(1)} Courses
                </h2>
              </div>
            </div>

            {courseList.map((course) => {
              const isExpanded = expandedCourses.has(course.id);
              const hasChapters = course.chapters.length > 0;

              return (
                <div key={course.id} className="mb-12">
                  {/* Course Header */}
                  <div
                    className="group mb-4 flex cursor-pointer items-center justify-between"
                    onClick={() =>
                      hasChapters && toggleCourseExpansion(course.id)
                    }
                  >
                    <div className="flex-1">
                      <span className="sr-only">{course.title}</span>
                      <p className="text-muted-foreground text-sm">
                        {course.description || "No description available"}
                      </p>
                      {hasChapters && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {course.chapters.length} chapter
                          {course.chapters.length !== 1 ? "s" : ""} •
                          {course.lessons.length} lesson
                          {course.lessons.length !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <Link
                        href={`/courses/${course.slug}`}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1 text-xs font-medium transition"
                      >
                        Start Course
                      </Link>
                      {hasChapters && (
                        <>
                          <span className="text-muted-foreground group-hover:text-foreground text-xs">
                            {isExpanded ? "Hide chapters" : "Show chapters"}
                          </span>
                          {isExpanded ? (
                            <ChevronUp
                              size={16}
                              className="text-muted-foreground"
                            />
                          ) : (
                            <ChevronDown
                              size={16}
                              className="text-muted-foreground"
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Course Poster (always visible) */}
                  <div className="-mx-4 overflow-x-auto px-4 pb-2">
                    <div className="flex gap-6">
                      <div>
                                              <div>
                        <CoursePosterCard
                          slug={course.slug}
                          title={course.title}
                          language={course.language}
                          description={course.description}
                          coverImageUrl={course.poster}
                          tagline={course.description}
                          accentColor="#6366f1"
                          chapterCount={course.chapters.length}
                          lessonCount={course.lessons.length}
                          variant="course"
                          onClick={() => {
                            // Navigate to course overview page
                            window.location.href = `/courses/${course.slug}`;
                          }}
                        />
                        {/* Debug info */}
                        {process.env.NODE_ENV === 'development' && course.poster && (
                          <div className="text-xs text-gray-500 mt-1 p-1 bg-gray-100 rounded">
                            Poster URL: {course.poster}
                          </div>
                        )}
                      </div>
                      </div>

                      {/* Chapter Posters (only when expanded) */}
                      {isExpanded &&
                        course.chapters.map((chapter) => (
                          <div key={chapter.id}>
                            <CoursePosterCard
                              slug={`/courses/${course.slug}`}
                              title={chapter.title}
                              language={course.language}
                              description={chapter.description}
                              coverImageUrl={chapter.poster}
                              tagline={chapter.description}
                              accentColor="#8b5cf6"
                              lessonCount={chapter.lessons.length}
                              variant="chapter"
                              onClick={() => {
                                // Navigate to course overview page
                                window.location.href = `/courses/${course.slug}`;
                              }}
                            />
                            {/* Debug info */}
                            {process.env.NODE_ENV === 'development' && chapter.poster && (
                              <div className="text-xs text-gray-500 mt-1 p-1 bg-gray-100 rounded">
                                Chapter Poster: {chapter.poster}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Expanded Chapter Details */}
                  {isExpanded && hasChapters && (
                    <div className="mt-6 space-y-4">
                      <h4 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                        Chapters in this course
                      </h4>
                      <div className="space-y-3">
                        {course.chapters.map((chapter, index) => (
                          <div
                            key={chapter.id}
                            className="bg-muted/30 flex items-center justify-between rounded-lg border p-4"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
                                {index + 1}
                              </div>
                              <div>
                                <h5 className="font-medium">{chapter.title}</h5>
                                {chapter.description && (
                                  <p className="text-muted-foreground mt-1 text-sm">
                                    {chapter.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Link
                              href={`/courses/${course.slug}`}
                              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition"
                            >
                              View Course
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </main>
  );
}
