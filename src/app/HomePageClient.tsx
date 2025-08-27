"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { CoursePosterCard } from "~/components/CoursePosterCard";
import { ChapterPosterCard } from "~/components/ChapterPosterCard";
import { useState } from "react";

type CourseWithChapters = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  language: string;
  poster: string | null;
  audience: "FREE" | null;
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

interface HomePageClientProps {
  initialCourses: CourseWithChapters[];
  isAdmin: boolean;
  isAuthed: boolean;
  isCreatiFunCustomer?: boolean;
  continueCourseSlug?: string | null;
}

export default function HomePageClient({
  initialCourses,
  isAdmin,
  isAuthed,
  isCreatiFunCustomer = false,
  continueCourseSlug,
}: HomePageClientProps) {
  const [courses] = useState<CourseWithChapters[]>(initialCourses);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || null;

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
                  href={continueCourseSlug ? `/learn?course=${continueCourseSlug}` : `/learn?course=${courses[0]?.slug ?? ""}`}
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
      {courses.length === 0 && (
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

      {/* Courses or Chapters */}
      <div id="courses" className="mt-10">
        {!selectedCourse ? (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-semibold tracking-tight">Courses</h2>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-6">
              {courses.map((course) => (
                <div key={course.id} className="space-y-2">
                  <CoursePosterCard
                    slug={course.slug}
                    title={course.title}
                    language={course.language}
                    description={course.description}
                    coverImageUrl={course.poster}
                    tagline={course.description}
                    accentColor="#6366f1"
                    ctaLabel="View chapters"
                    onClick={() => setSelectedCourseId(course.id)}
                  />
                  <div className="px-0.5">
                    <div className="text-sm font-medium leading-tight">{course.title}</div>
                    <div className="text-muted-foreground text-xs">
                      {course.chapters.length} chapter{course.chapters.length !== 1 ? "s" : ""}
                      {" • "}
                      {course.lessons.length} lesson{course.lessons.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{selectedCourse.title}</h2>
                {selectedCourse.description && (
                  <p className="text-muted-foreground text-sm">{selectedCourse.description}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedCourseId(null)}
                className="hover:bg-accent rounded-md border px-3 py-1.5 text-xs font-medium"
              >
                Back to courses
              </button>
            </div>
            {selectedCourse.chapters.length === 0 ? (
              <div className="text-muted-foreground text-sm">This course has no chapters. Start now.</div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-6">
                {selectedCourse.chapters.map((chapter) => (
                  <div key={chapter.id} className="space-y-2">
                    <ChapterPosterCard
                      slug={`/learn?course=${selectedCourse.slug}&chapter=${chapter.slug}`}
                      title={chapter.title}
                      language={selectedCourse.language}
                      description={chapter.description}
                      coverImageUrl={chapter.poster}
                      tagline={chapter.description}
                      lessonCount={chapter.lessons.length}
                      onClick={() => (window.location.href = `/learn?course=${selectedCourse.slug}&chapter=${chapter.slug}`)}
                    />
                    <div className="px-0.5">
                      <div className="text-sm font-medium leading-tight">{chapter.title}</div>
                      <div className="text-muted-foreground text-xs">
                        {chapter.lessons.length} lesson{chapter.lessons.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
