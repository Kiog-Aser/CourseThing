"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, ChevronDown, ChevronUp, BookOpen, Clock } from "lucide-react";
import { api } from "~/trpc/react";

type LessonRecord = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  kind: "VIDEO" | "TEXT";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  content?: string | null;
  contentJson?: string | null;
  youtubeId?: string | null;
  order: number;
  chapterId?: string | null;
};

type ChapterRecord = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  poster?: string | null;
  order: number;
  lessons: LessonRecord[];
};

type CourseRecord = {
  id: string;
  slug: string;
  title: string;
  language: string;
  description?: string | null;
  poster?: string | null;
  lessons: LessonRecord[];
  chapters: ChapterRecord[];
};

export default function CourseOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const toggleChapterExpansion = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const courseQuery = api.course.bySlug.useQuery(
    { slug },
    {
      enabled: !!slug,
    },
  );

  const course: CourseRecord | undefined = courseQuery.data as CourseRecord | undefined;

  if (courseQuery.status === "pending") {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-5 py-8">
          <div className="space-y-6">
            <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-96 animate-pulse rounded bg-gray-200" />
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (courseQuery.status === "error" || !course) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-5 py-8 text-center">
          <BookOpen className="text-muted-foreground h-12 w-12" />
          <h1 className="text-xl font-semibold">Course Not Found</h1>
          <p className="text-muted-foreground text-sm">
            The course you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Combine and sort all lessons (standalone + in chapters)
  const allLessons = [
    ...course.lessons,
    ...course.chapters.flatMap((chapter) => chapter.lessons),
  ].filter((lesson) => lesson.status === "PUBLISHED")
   .sort((a, b) => a.order - b.order);

  const totalLessons = allLessons.length;
  const videoLessons = allLessons.filter(l => l.kind === "VIDEO" || l.youtubeId).length;
  const textLessons = totalLessons - videoLessons;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-4xl px-5 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
              {course.description && (
                <p className="text-muted-foreground text-lg mt-2">
                  {course.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="space-y-8">
          {/* Course Content Overview */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Course Content</h2>

            {/* Standalone Lessons (not in chapters) */}
            {course.lessons.filter(l => l.status === "PUBLISHED").length > 0 && (
              <div className="space-y-4">
                <h3 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                  Course Lessons
                </h3>
                <div className="space-y-3">
                  {course.lessons
                    .filter(lesson => lesson.status === "PUBLISHED")
                    .sort((a, b) => a.order - b.order)
                    .map((lesson, index) => (
                      <div
                        key={lesson.id}
                        className="bg-muted/20 hover:bg-muted/30 flex items-center justify-between rounded-lg border p-4 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{lesson.title}</h4>
                            {lesson.description && (
                              <p className="text-muted-foreground mt-1 text-sm line-clamp-2">
                                {lesson.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {lesson.kind === "VIDEO" || lesson.youtubeId ? (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Play size={12} />
                                  Video
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <BookOpen size={12} />
                                  Text
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Link
                          href={`/learn?course=${course.slug}`}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition"
                        >
                          {index === 0 ? 'Start Free' : 'Continue'}
                        </Link>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Chapters */}
            {course.chapters.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                  Chapters
                </h3>
                <div className="space-y-4">
                  {course.chapters
                    .sort((a, b) => a.order - b.order)
                    .map((chapter, chapterIndex) => {
                      const isExpanded = expandedChapters.has(chapter.id);
                      const publishedLessons = chapter.lessons.filter(l => l.status === "PUBLISHED");

                      return (
                        <div key={chapter.id} className="space-y-3">
                          {/* Chapter Header */}
                          <button
                            onClick={() => toggleChapterExpansion(chapter.id)}
                            className="bg-muted/30 hover:bg-muted/40 flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium">
                                {chapterIndex + 1}
                              </div>
                              <div>
                                <h4 className="font-medium">{chapter.title}</h4>
                                {chapter.description && (
                                  <p className="text-muted-foreground mt-1 text-sm">
                                    {chapter.description}
                                  </p>
                                )}
                                <p className="text-muted-foreground mt-1 text-xs">
                                  {publishedLessons.length} lesson{publishedLessons.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="text-muted-foreground" size={20} />
                            ) : (
                              <ChevronDown className="text-muted-foreground" size={20} />
                            )}
                          </button>

                          {/* Chapter Lessons */}
                          {isExpanded && publishedLessons.length > 0 && (
                            <div className="ml-8 space-y-2">
                              {publishedLessons
                                .sort((a, b) => a.order - b.order)
                                .map((lesson, lessonIndex) => (
                                  <div
                                    key={lesson.id}
                                    className="bg-background hover:bg-muted/20 flex items-center justify-between rounded-lg border p-3 transition-colors"
                                  >
                                                                          <div className="flex items-center gap-3">
                                        <div className="text-muted-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
                                          {chapterIndex + 1}.{lessonIndex + 1}
                                        </div>
                                        <div className="flex-1">
                                          <h5 className="text-sm font-medium">{lesson.title}</h5>
                                          {lesson.description && (
                                            <p className="text-muted-foreground mt-1 text-xs line-clamp-1">
                                              {lesson.description}
                                            </p>
                                          )}

                                        </div>
                                      </div>
                                    <Link
                                      href={`/learn?course=${course.slug}&chapter=${chapter.slug}`}
                                      className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                                    >
                                      Start
                                    </Link>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
