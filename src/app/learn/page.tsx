"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  PlayCircle,
  CheckCircle2,
  Loader2,
  TriangleAlert,
  Lock,
  Folder,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import CreativeFunSubscriptionGuard from "~/components/CreativeFunSubscriptionGuard";
import { truncateWords } from "~/lib/utils";
import confetti from "canvas-confetti";

/* -------------------------------------------------------------------------- */
/* Types (learner side simplified)                                            */
/* -------------------------------------------------------------------------- */

type LessonRecord = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  kind: "VIDEO" | "TEXT";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  content: string | null;
  contentJson: string | null;
  youtubeId: string | null;
  order: number;
};

type ChapterRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order: number;
  lessons: LessonRecord[];
};

type CourseRecord = {
  id: string;
  slug: string;
  title: string;
  language: string;
  description: string | null;
  lessons: LessonRecord[];
  chapters: ChapterRecord[];
};

/* -------------------------------------------------------------------------- */
/* JSON -> React renderer (minimal subset + YouTube + raw iframe support)     */
/* -------------------------------------------------------------------------- */

interface JSONNode {
  type?: string;
  text?: string;
  content?: JSONNode[];
  attrs?: Record<string, any>;
  marks?: { type: string }[];
}

function collectText(node: JSONNode | undefined): string {
  if (!node) return "";
  if (node.text) return node.text;
  return (node.content ?? []).map(collectText).join("");
}

function renderJSON(
  nodes: JSONNode[] | undefined,
  keyPrefix = "n",
): React.ReactNode {
  if (!nodes) return null;
  const out: React.ReactNode[] = [];
  nodes.forEach((node, index) => {
    if (!node) return;
    const key = `${keyPrefix}-${index}`;
    switch (node.type) {
      case "paragraph": {
        const children = node.content ?? [];
        const hasBlockish = children.some((c) => {
          const t = c?.type;
          if (!t) return false;
          if (
            [
              "youtube",
              "image",
              "codeBlock",
              "orderedList",
              "bulletList",
              "heading",
              "blockquote",
            ].includes(t)
          )
            return true;
          if (t === "text") {
            const txt = c.text ?? "";
            if (txt.includes("<iframe") && txt.includes("</iframe>"))
              return true;
            if (
              /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:(?:watch\?(?:.*&)?v=)|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i.test(
                txt.trim(),
              )
            )
              return true;
          }
          return false;
        });
        if (hasBlockish) {
          out.push(
            <React.Fragment key={key}>
              {renderJSON(children, key)}
            </React.Fragment>,
          );
          break;
        }
        const inner = renderJSON(children, key);
        const textOnly = collectText(node).trim();
        if (!textOnly && !inner) {
          out.push(<p key={key} className="h-4" />);
        } else {
          out.push(
            <p
              key={key}
              className="mb-4 leading-relaxed whitespace-pre-wrap"
            >
              {inner}
            </p>,
          );
        }
        break;
      }
      case "heading": {
        const level = Math.min(Math.max(node.attrs?.level ?? 2, 1), 3);
        const tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
        out.push(
          React.createElement(
            tag,
            { key, className: "mt-6 first:mt-0" },
            renderJSON(node.content, key),
          ),
        );
        break;
      }
      case "bulletList":
        out.push(
          <ul key={key} className="list-disc pl-6">
            {renderJSON(node.content, key)}
          </ul>,
        );
        break;
      case "orderedList":
        out.push(
          <ol key={key} className="list-decimal pl-6">
            {renderJSON(node.content, key)}
          </ol>,
        );
        break;
      case "listItem":
        out.push(<li key={key}>{renderJSON(node.content, key)}</li>);
        break;
      case "blockquote":
        out.push(
          <blockquote key={key} className="border-l-4 pl-4 italic">
            {renderJSON(node.content, key)}
          </blockquote>,
        );
        break;
      case "codeBlock":
        out.push(
          <pre
            key={key}
            className="bg-muted rounded-md px-3 py-2 text-xs leading-snug overflow-x-auto"
          >
            <code>{collectText(node)}</code>
          </pre>,
        );
        break;
      case "horizontalRule":
        out.push(<hr key={key} className="my-6" />);
        break;
      case "hardBreak":
        out.push(<br key={key} />);
        break;
      case "youtube": {
        const src: string | undefined =
          node.attrs?.src ||
          (node.attrs?.videoId
            ? `https://www.youtube.com/embed/${node.attrs.videoId}`
            : undefined);
        if (src) {
          out.push(
            <div
              key={key}
              className="my-6 aspect-video w-full overflow-hidden rounded-lg border bg-black/50 shadow"
            >
              <iframe
                className="h-full w-full"
                src={src}
                title="Embedded video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>,
          );
        }
        break;
      }
      case "image": {
        const src: string | undefined = node.attrs?.src;
        const alt: string = node.attrs?.alt || "";
        const caption: string = node.attrs?.caption || "";
        if (src) {
          out.push(
            <div key={key} className="my-6">
              <div className="relative overflow-hidden rounded-lg border bg-muted/20">
                <img
                  src={src}
                  alt={alt}
                  className="w-full h-auto object-cover"
                  style={{ maxHeight: '600px' }}
                />
              </div>
              {caption && (
                <p className="text-muted-foreground text-sm text-center mt-2 italic">
                  {caption}
                </p>
              )}
            </div>
          );
        }
        break;
      }
      case "text": {
        let text = node.text ?? "";
        if (text.includes("<iframe") && text.includes("</iframe>")) {
          out.push(
            <div
              key={key}
              className="my-6 w-full overflow-hidden"
              dangerouslySetInnerHTML={{ __html: text }}
            />,
          );
          break;
        }
        const ytMatch = text
          .trim()
          .match(
            /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:(?:watch\?(?:.*&)?v=)|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i,
          );
        if (ytMatch) {
          const id = ytMatch[1];
          // Render as inline-safe content (anchor + thumbnail) to avoid placing a block <div> (with iframe)
          // inside a paragraph, which causes hydration errors. If you want the full embedded iframe,
          // adjust the paragraph rendering logic to detect block children and skip wrapping in <p>.
          out.push(
            <div
              key={key}
              className="my-6 aspect-video w-full overflow-hidden rounded-md border bg-black/50"
            >
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${id}`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>,
          );
          break;
        }
        const marks = node.marks?.map((m) => m.type) ?? [];
        let el: React.ReactNode = text;
        if (marks.includes("code")) {
          el = (
            <code key={key} className="bg-muted rounded px-1 py-0.5 text-xs">
              {el}
            </code>
          );
        }
        if (marks.includes("bold")) {
          el = (
            <strong key={key} className="font-semibold">
              {el}
            </strong>
          );
        }
        if (marks.includes("italic")) {
          el = (
            <em key={key} className="italic">
              {el}
            </em>
          );
        }
        if (marks.includes("link")) {
          const linkMark = node.marks?.find((m) => m.type === "link");
          const href = linkMark?.attrs?.href || "#";
          const target = linkMark?.attrs?.target || "_blank";
          el = (
            <a
              key={key}
              href={href}
              target={target}
              rel={target === "_blank" ? "noopener noreferrer" : undefined}
              className="text-primary underline hover:text-primary/80"
            >
              {el}
            </a>
          );
        }
        out.push(<React.Fragment key={key}>{el}</React.Fragment>);
        break;
      }
      default: {
        if (node.content) {
          out.push(
            <React.Fragment key={key}>
              {renderJSON(node.content, key)}
            </React.Fragment>,
          );
        }
      }
    }
  });
  return out;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function LearnPage() {
  const search = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthed = !!session?.user;
  const [lockedAttempt, setLockedAttempt] = useState<LessonRecord | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [optimisticCompletedIds, setOptimisticCompletedIds] = useState<
    string[] | null
  >(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(),
  );
  const courseSlug = search.get("course")?.trim() || "";
  const chapterSlug = search.get("chapter")?.trim();
  const lessonId = search.get("lesson")?.trim();



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
    { slug: courseSlug },
    {
      enabled: !!courseSlug && courseSlug.length > 0,
    },
  );

  const course: CourseRecord | undefined = courseQuery.data as
    | CourseRecord
    | undefined;

  const lessons: LessonRecord[] = useMemo(() => {
    if (!course) return [];
    // Order to match sidebar: chapters by chapter.order then lesson.order, then standalone by order
    const chapterLessonsOrdered = [...course.chapters]
      .sort((a, b) => a.order - b.order)
      .flatMap((chapter) =>
        [...chapter.lessons]
          .filter((l) => l.status === "PUBLISHED")
          .sort((a, b) => a.order - b.order),
      );

    const standaloneLessonsOrdered = [...course.lessons]
      .filter((l) => l.status === "PUBLISHED")
      .sort((a, b) => a.order - b.order);

    return [...chapterLessonsOrdered, ...standaloneLessonsOrdered];
  }, [course]);

  const firstLessonId = lessons[0]?.id ?? null;

  // --- Progress & Completion State (HOOKS) ---
  const courseId = course?.id ?? "";
  const { data: completedLessonIds = [], refetch: refetchCompletions } =
    api.course.getLessonCompletions.useQuery(
      { courseId },
      { enabled: !!courseId && isAuthed },
    );

  const markCompleted = api.course.markLessonCompleted.useMutation({
    onSuccess: () => {
      refetchCompletions();
    },
  });
  const unmarkCompleted = api.course.unmarkLessonCompleted.useMutation({
    onSuccess: () => {
      refetchCompletions();
    },
  });

  // Only clear optimisticCompletedIds when the query data includes all optimistic completions
  React.useEffect(() => {
    if (
      optimisticCompletedIds &&
      optimisticCompletedIds.every((id) => completedLessonIds.includes(id))
    ) {
      setOptimisticCompletedIds(null);
    }
  }, [completedLessonIds, optimisticCompletedIds]);

  const optimisticIds = optimisticCompletedIds ?? completedLessonIds;
  const totalLessons = lessons.length;
  const completedCount = optimisticIds.length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // --- Confetti and Congrats Popup ---
  const [showCongrats, setShowCongrats] = useState(false);
  const prevCompletedCount = useRef(completedCount);

  useEffect(() => {
    // Show popup immediately if already completed on mount
    if (
      totalLessons > 0 &&
      completedCount === totalLessons &&
      prevCompletedCount.current < totalLessons
    ) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
      });
      setShowCongrats(true);
    }
    prevCompletedCount.current = completedCount;
  }, [completedCount, totalLessons]);

  // Show popup immediately if already completed on first render
  useEffect(() => {
    if (totalLessons > 0 && completedCount === totalLessons) {
      setShowCongrats(true);
    }
  }, [totalLessons, completedCount]);

  // --- Auto-select lesson based on URL parameters or progress ---
  React.useEffect(() => {
    if (lessons.length === 0) {
      setActiveId(null);
      return;
    }

    // Priority 1: If lessonId is specified in URL, use it
    if (lessonId && lessons.find((l) => l.id === lessonId)) {
      // Expand the chapter if the lesson belongs to one
      const lesson = lessons.find((l) => l.id === lessonId);
      if (lesson && course) {
        // Find which chapter this lesson belongs to
        const chapterWithLesson = course.chapters.find((chapter) =>
          chapter.lessons.some((l) => l.id === lessonId)
        );
        if (chapterWithLesson) {
          setExpandedChapters((prev) => {
            const newSet = new Set(prev);
            newSet.add(chapterWithLesson.id);
            return newSet;
          });
        }
      }
      setActiveId(lessonId);
      return;
    }

    // Priority 2: Handle chapter URL parameter
    if (chapterSlug && course) {
      const targetChapter = course.chapters.find((c) => c.slug === chapterSlug);
      if (targetChapter && targetChapter.lessons.length > 0) {
        // Expand the chapter
        setExpandedChapters((prev) => {
          const newSet = new Set(prev);
          if (!newSet.has(targetChapter.id)) {
            newSet.add(targetChapter.id);
            return newSet;
          }
          return prev; // Don't update if already expanded
        });
        // Select next incomplete lesson in chapter if not already selected
        if (
          !activeId ||
          !targetChapter.lessons.find((l) => l.id === activeId)
        ) {
          // Find the next incomplete lesson in this chapter
          const nextIncompleteLesson = targetChapter.lessons.find(
            (lesson) => !optimisticIds.includes(lesson.id)
          );
          setActiveId(nextIncompleteLesson ? nextIncompleteLesson.id : targetChapter.lessons[0]!.id);
        }
        return;
      }
    }

    // Priority 3: Find first incomplete lesson, else fallback to first lesson
    const firstIncomplete = lessons.find(
      (l) => !completedLessonIds.includes(l.id),
    );
    if (!activeId || !lessons.find((l) => l.id === activeId)) {
      setActiveId(firstIncomplete ? firstIncomplete.id : lessons[0]!.id);
    }
  }, [lessons.length, activeId, optimisticIds.join(','), chapterSlug, lessonId, course?.id]);

  const active = lessons.find((l) => l.id === activeId) || null;

  if (!courseSlug) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <TriangleAlert className="text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          No course selected. Go back to the homepage and choose a course.
        </p>
      </div>
    );
  }

  if (courseQuery.status === "pending") {
    // Skeleton loading UI for sidebar and main content
    return (
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Sidebar Skeleton */}
        <aside className="bg-muted/30 w-full border-b p-4 md:w-72 md:border-r md:border-b-0">
          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="h-3 w-20 animate-pulse rounded bg-gray-200" />
              <span className="h-3 w-8 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="h-2.5 w-full animate-pulse rounded-full bg-gray-200" />
            <div className="mt-1 h-2 w-24 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="mb-4">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="mt-1 h-3 w-40 animate-pulse rounded bg-gray-200" />
          </div>
          <nav className="mt-6 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex animate-pulse items-center gap-3 rounded-md bg-gray-100 px-3 py-3"
              >
                <span className="h-4 w-4 rounded-full bg-gray-300" />
                <span className="h-3 w-24 rounded bg-gray-300" />
              </div>
            ))}
          </nav>
        </aside>
        {/* Main Content Skeleton */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex flex-col gap-2">
              <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="aspect-video w-full animate-pulse rounded-lg bg-gray-200" />
            <div className="mt-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-4 w-full animate-pulse rounded bg-gray-100"
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (courseQuery.status === "error" || !course) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <TriangleAlert className="text-destructive" />
        <p className="text-sm">
          Could not load that course. It may have been removed or is not
          published yet.
        </p>
        <button
          onClick={() => router.push("/")}
          className="hover:bg-accent rounded-md border px-3 py-1.5 text-xs font-medium"
        >
          Back Home
        </button>
      </div>
    );
  }

  // Check if this course is free (no CreatiFun subscription required)
  const isFreeCourse = course?.audience === 'FREE';

  const content = (<>
      {/* Congrats Modal */}
      {showCongrats && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowCongrats(false)}
        >
          <div
            className="relative flex max-w-xs flex-col items-center gap-4 rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="text-muted-foreground hover:bg-muted absolute top-2 right-2 rounded-full p-1 transition"
              aria-label="Close"
              onClick={() => setShowCongrats(false)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M6 6l8 8M14 6l-8 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <span className="text-4xl">🎉</span>
            <h2 className="text-center text-xl font-bold">Congratulations!</h2>
            <p className="text-muted-foreground text-center">
              You finished this course. Ready for the next one?
            </p>
            <button
              className="bg-primary text-primary-foreground mt-2 rounded-md px-4 py-2 font-semibold"
              onClick={() => {
                setShowCongrats(false);
                window.location.href = "/";
              }}
            >
              Start a new course
            </button>
          </div>
        </div>
      )}
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="bg-muted/30 w-full border-b p-4 md:w-72 md:border-r md:border-b-0">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">
                Progress
              </span>
              <span className="text-primary text-xs font-semibold">
                {progressPercent}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="bg-primary h-2.5 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="text-muted-foreground mt-1 text-right text-[10px]">
              {completedCount} of {totalLessons} lessons completed
            </div>
          </div>
          <div className="mb-4">
            <h2 className="text-muted-foreground text-sm font-medium tracking-wide">
              {course.title}
            </h2>
            <p className="text-muted-foreground mt-1 line-clamp-3 text-[11px] leading-snug">
              {course.description || "No description provided."}
            </p>
          </div>
          <nav className="space-y-1">
            {/* Chapters with lessons */}
            {course?.chapters?.map((chapter) => {
              const isExpanded = expandedChapters.has(chapter.id);
              const chapterLessons = chapter.lessons.filter(
                (l) => l.status === "PUBLISHED",
              );

              return (
                <div key={chapter.id} className="space-y-1">
                  <button
                    onClick={() => toggleChapterExpansion(chapter.id)}
                    className="group border-muted-foreground/30 text-muted-foreground hover:bg-accent/20 flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm font-medium"
                  >
                    <Folder size={14} />
                    <span className="flex-1 cursor-grab text-left">
                      {chapter.title}
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>

                  {/* Chapter lessons (only when expanded) */}
                  {isExpanded &&
                    chapterLessons.map((lesson, lessonIdx) => {
                      const isActive = lesson.id === activeId;
                      const isVideo =
                        lesson.kind === "VIDEO" || !!lesson.youtubeId;
                      // Check if this course is completely free
                      const free = isFreeCourse;
                      // First lesson follows sidebar ordering
                      const isFirstLesson = !!firstLessonId && lesson.id === firstLessonId;
                      const isCustomer = session?.user?.creativeFunSubscription === true;
                      // First lesson: free for everyone, other lessons: require login, premium courses also need subscription
                      const locked = !isFirstLesson && (!isAuthed || (!isFreeCourse && !isCustomer));

                      // Determine lock reason for better UX
                      const lockReason = !isAuthed ? 'auth' :
                                       !isFreeCourse && !isCustomer ? 'subscription' : null;
                      const isCompleted = optimisticIds.includes(lesson.id);

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => {
                            if (locked) {
                              setLockedAttempt(lesson);
                              setActiveId(lessons[0]?.id ?? null);
                              return;
                            }
                            setLockedAttempt(null);
                            setActiveId(lesson.id);
                            // Update URL to include lesson parameter for refresh persistence
                            const url = new URL(window.location.href);
                            url.searchParams.set('lesson', lesson.id);
                            window.history.replaceState({}, '', url.toString());
                          }}
                          className={
                            "group mx-3.5 flex w-60 items-center rounded-md border px-2.5 py-2 text-sm transition " +
                            (isActive
                              ? "border-primary bg-primary/10 text-primary"
                              : locked
                                ? "bg-background/60 border-border/40 text-foreground/70 hover:bg-accent/40 border-dashed"
                                : "bg-background hover:border-accent hover:bg-accent border-transparent")
                          }
                        >
                          <span className="text-muted-foreground mt-0.5 mr-2 cursor-grab text-xs font-semibold select-none">
                            {lessonIdx + 1}
                          </span>
                          <span className="flex-1 text-left leading-snug">
                            {lesson.title || "Untitled"}
                            {lesson.description && (
                              <div
                                className="text-muted-foreground mt-0.5 text-[11px] leading-tight"
                                title={lesson.description}
                              >
                                {truncateWords(lesson.description, 5)}
                              </div>
                            )}
                          </span>
                          {locked ? (
                            <Lock
                              size={16}
                              className={
                                "mt-0.5 opacity-70 group-hover:opacity-100 " +
                                (isActive
                                  ? "text-primary"
                                  : "text-muted-foreground")
                              }
                            />
                          ) : isVideo ? (
                            <PlayCircle
                              size={16}
                              className={
                                "mt-0.5 opacity-70 group-hover:opacity-100 " +
                                (isActive
                                  ? "text-primary"
                                  : "text-muted-foreground")
                              }
                            />
                          ) : null}
                          {/* Completion toggle */}
                          <span
                            className="ml-2 flex items-center justify-center rounded-full p-0.5 transition"
                            style={{ height: 20, width: 20, cursor: "pointer" }}
                            title={
                              isCompleted
                                ? "Mark as incomplete"
                                : "Mark as completed"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isCompleted) {
                                unmarkCompleted.mutate({ lessonId: lesson.id });
                              } else {
                                markCompleted.mutate({ lessonId: lesson.id });
                              }
                            }}
                            aria-label={
                              isCompleted
                                ? "Mark as incomplete"
                                : "Mark as completed"
                            }
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                if (isCompleted) {
                                  unmarkCompleted.mutate({
                                    lessonId: lesson.id,
                                  });
                                } else {
                                  markCompleted.mutate({ lessonId: lesson.id });
                                }
                              }
                            }}
                          >
                            {isCompleted ? (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 20 20"
                                className="block"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <circle cx="10" cy="10" r="9" fill="#10b981" />
                                <path
                                  d="M6.5 10.5L9 13L14 8"
                                  stroke="white"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  fill="none"
                                />
                              </svg>
                            ) : (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 20 20"
                                className="block"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <circle
                                  cx="10"
                                  cy="10"
                                  r="9"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                />
                              </svg>
                            )}
                          </span>
                        </button>
                      );
                    })}
                </div>
              );
            })}

            {/* Standalone lessons (not in chapters) */}
            {course?.lessons?.map((lesson, idx) => {
              const isActive = lesson.id === activeId;
              const isVideo = lesson.kind === "VIDEO" || !!lesson.youtubeId;
              // Check if this course is completely free
              const free = isFreeCourse;
              // First lesson follows sidebar ordering
              const isFirstLesson = !!firstLessonId && lesson.id === firstLessonId;
              const isCustomer = session?.user?.creativeFunSubscription === true;
              // First lesson: free for everyone, other lessons: require login, premium courses also need subscription
              const locked = !isFirstLesson && (!isAuthed || (!isFreeCourse && !isCustomer));

              // Determine lock reason for better UX
              const lockReason = !isAuthed ? 'auth' :
                               !isFreeCourse && !isCustomer ? 'subscription' : null;
              const isCompleted = optimisticIds.includes(lesson.id);

              return (
                <button
                  key={lesson.id}
                  onClick={() => {
                    if (locked) {
                      setLockedAttempt(lesson);
                      setActiveId(lessons[0]?.id ?? null);
                      return;
                    }
                    setLockedAttempt(null);
                    setActiveId(lesson.id);
                    // Update URL to include lesson parameter for refresh persistence
                    const url = new URL(window.location.href);
                    url.searchParams.set('lesson', lesson.id);
                    window.history.replaceState({}, '', url.toString());
                  }}
                  className={
                    "group flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left text-[15px] transition " +
                    (isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : locked
                        ? "bg-background/60 border-border/40 text-foreground/70 hover:bg-accent/40 border-dashed"
                        : "bg-background hover:border-accent hover:bg-accent border-transparent")
                  }
                >
                  <span className="text-muted-foreground mt-0.5 text-[10px] font-semibold">
                    {idx + 1}
                  </span>
                  <span className="flex-1 leading-snug">
                    {lesson.title || "Untitled"}
                    {lesson.description && (
                      <div
                        className="text-muted-foreground mt-0.5 text-[11px] leading-tight"
                        title={lesson.description}
                      >
                        {truncateWords(lesson.description, 5)}
                      </div>
                    )}
                  </span>
                  {locked ? (
                    <Lock
                      size={20}
                      className={
                        "mt-0.5 opacity-70 group-hover:opacity-100 " +
                        (isActive ? "text-primary" : "text-muted-foreground")
                      }
                    />
                  ) : isVideo ? (
                    <PlayCircle
                      size={20}
                      className={
                        "mt-0.5 opacity-70 group-hover:opacity-100 " +
                        (isActive ? "text-primary" : "text-muted-foreground")
                      }
                    />
                  ) : null}
                  {/* Completion toggle */}
                  <span
                    className="ml-2 flex items-center justify-center rounded-full p-0.5 transition hover:bg-emerald-50"
                    style={{ height: 24, width: 24, cursor: "pointer" }}
                    title={
                      isCompleted ? "Mark as incomplete" : "Mark as completed"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isCompleted) {
                        unmarkCompleted.mutate({ lessonId: lesson.id });
                      } else {
                        markCompleted.mutate({ lessonId: lesson.id });
                      }
                    }}
                    aria-label={
                      isCompleted ? "Mark as incomplete" : "Mark as completed"
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (isCompleted) {
                          unmarkCompleted.mutate({ lessonId: lesson.id });
                        } else {
                          markCompleted.mutate({ lessonId: lesson.id });
                        }
                      }
                    }}
                  >
                    {isCompleted ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        className="block"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="10" cy="10" r="9" fill="#10b981" />
                        <path
                          d="M6.5 10.5L9 13L14 8"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        className="block"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          cx="10"
                          cy="10"
                          r="9"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {lockedAttempt ? (
              (() => {
                const lesson = lockedAttempt;
                const free = isFreeCourse;
                const isFirstLesson = !!firstLessonId && lesson.id === firstLessonId;
                const isCustomer = session?.user?.creativeFunSubscription === true;
                const needsAuth = !isAuthed;
                const needsSubscription = isAuthed && !isFreeCourse && !isCustomer;

                return (
                  <div className="flex min-h-[70vh] w-full items-center justify-center">
                    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-5 text-center border border-dashed rounded-lg p-8">
                      <Lock className="text-muted-foreground h-12 w-12" />
                                              <div className="space-y-3">
                          <h2 className="text-xl font-semibold tracking-tight">
                            {needsAuth ? "Sign In Required" : "CreatiFun Subscription Required"}
                          </h2>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            {needsAuth
                              ? "You need to be signed in to access the entire course."
                              : "This premium content is exclusively available to CreatiFun subscribers. Subscribe to unlock access to all premium courses and exclusive content."
                            }
                          </p>
                        </div>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        {needsAuth ? (
                          <>
                            <button
                              onClick={() =>
                                router.push(
                                  "/signup?callbackUrl=" +
                                    encodeURIComponent(
                                      window.location.pathname + window.location.search,
                                    ),
                                )
                              }
                              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium shadow hover:opacity-90"
                            >
                              Create free account
                            </button>
                            <button
                              onClick={() =>
                                router.push(
                                  "/signin?callbackUrl=" +
                                    encodeURIComponent(
                                      window.location.pathname + window.location.search,
                                    ),
                                )
                              }
                              className="hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium"
                            >
                              Sign in
                            </button>
                          </>
                        ) : (
                          <>
                            <a
                              href="https://creati.fun"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium shadow hover:opacity-90"
                            >
                              Subscribe to CreatiFun
                            </a>
                            <a
                              href="mailto:milloranh@gmail.com?subject=CreatiFun Support Request"
                              className="hover:bg-accent rounded-md border px-4 py-2 text-sm font-medium"
                            >
                              Contact Support
                            </a>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setLockedAttempt(null);
                            setActiveId(lessons[0]?.id ?? null);
                          }}
                          className="text-muted-foreground text-xs underline-offset-4 hover:underline"
                        >
                          Back to first lesson
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : active ? (
              <>
                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl leading-tight font-bold tracking-tight md:text-3xl">
                    {active.title}
                  </h1>
                  {active.description && (
                    <div className="text-muted-foreground text-sm leading-snug">
                      {active.description}
                    </div>
                  )}
                  <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    Lesson {lessons.findIndex((l) => l.id === active.id) + 1} of{" "}
                    {lessons.length}
                  </div>
                </div>

                {active.youtubeId && (
                  <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black/50 shadow">
                    <iframe
                      className="h-full w-full"
                      src={`https://www.youtube.com/embed/${active.youtubeId}`}
                      title="Lesson video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                )}

                <article className="prose dark:prose-invert max-w-none">
                  {active.contentJson
                    ? (() => {
                        // Markdown heading rendering: parse #, ##, ### at line start and render as h1, h2, h3
                        const renderMarkdownHeadings = (text: string) => {
                          const lines = text.split("\n");
                          const paragraphs: React.ReactNode[] = [];
                          let currentParagraph: string[] = [];

                          lines.forEach((line, idx) => {
                            const trimmed = line.trim();

                            // Handle headings
                            if (trimmed.startsWith("### ")) {
                              if (currentParagraph.length > 0) {
                                paragraphs.push(
                                  <p key={`p-${paragraphs.length}`} className="mb-4">
                                    {currentParagraph.map((text, i) => (
                                      <React.Fragment key={i}>
                                        {i > 0 && <br />}
                                        {text}
                                      </React.Fragment>
                                    ))}
                                  </p>
                                );
                                currentParagraph = [];
                              }
                              paragraphs.push(
                                <h3 key={idx} className="mt-6 first:mt-0">
                                  {trimmed.replace(/^###\s+/, "")}
                                </h3>
                              );
                            } else if (trimmed.startsWith("## ")) {
                              if (currentParagraph.length > 0) {
                                paragraphs.push(
                                  <p key={`p-${paragraphs.length}`} className="mb-4">
                                    {currentParagraph.map((text, i) => (
                                      <React.Fragment key={i}>
                                        {i > 0 && <br />}
                                        {text}
                                      </React.Fragment>
                                    ))}
                                  </p>
                                );
                                currentParagraph = [];
                              }
                              paragraphs.push(
                                <h2 key={idx} className="mt-6 first:mt-0">
                                  {trimmed.replace(/^##\s+/, "")}
                                </h2>
                              );
                            } else if (trimmed.startsWith("# ")) {
                              if (currentParagraph.length > 0) {
                                paragraphs.push(
                                  <p key={`p-${paragraphs.length}`} className="mb-4">
                                    {currentParagraph.map((text, i) => (
                                      <React.Fragment key={i}>
                                        {i > 0 && <br />}
                                        {text}
                                      </React.Fragment>
                                    ))}
                                  </p>
                                );
                                currentParagraph = [];
                              }
                              paragraphs.push(
                                <h1 key={idx} className="mt-6 first:mt-0">
                                  {trimmed.replace(/^#\s+/, "")}
                                </h1>
                              );
                            } else if (trimmed === "") {
                              // Empty line - end current paragraph and add spacing
                              if (currentParagraph.length > 0) {
                                paragraphs.push(
                                  <p key={`p-${paragraphs.length}`} className="mb-4">
                                    {currentParagraph.map((text, i) => (
                                      <React.Fragment key={i}>
                                        {i > 0 && <br />}
                                        {text}
                                      </React.Fragment>
                                    ))}
                                  </p>
                                );
                                currentParagraph = [];
                              }
                              // Add a spacer div for empty lines to create visual separation
                              paragraphs.push(<div key={`spacer-${paragraphs.length}`} className="h-4" />);
                            } else {
                              // Check for markdown links [text](url) in the line
                              const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                              let processedLine = line;
                              const links: { text: string; url: string; index: number }[] = [];
                              let match;

                              while ((match = linkRegex.exec(line)) !== null) {
                                links.push({
                                  text: match[1],
                                  url: match[2],
                                  index: match.index
                                });
                              }

                              if (links.length > 0) {
                                // Replace markdown links with React elements
                                const parts: (string | React.ReactNode)[] = [];
                                let lastIndex = 0;

                                links.forEach((link, linkIdx) => {
                                  // Add text before the link
                                  if (link.index > lastIndex) {
                                    parts.push(line.slice(lastIndex, link.index));
                                  }

                                  // Add the link
                                  parts.push(
                                    <a
                                      key={`link-${idx}-${linkIdx}`}
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary underline hover:text-primary/80"
                                    >
                                      {link.text}
                                    </a>
                                  );

                                  lastIndex = link.index + match![0].length;
                                });

                                // Add remaining text after the last link
                                if (lastIndex < line.length) {
                                  parts.push(line.slice(lastIndex));
                                }

                                currentParagraph.push(
                                  <span key={`text-with-links-${idx}`}>
                                    {parts}
                                  </span>
                                );
                              } else {
                                // Regular line without links
                                currentParagraph.push(line);
                              }
                            }
                          });

                          // Handle any remaining content
                          if (currentParagraph.length > 0) {
                            paragraphs.push(
                              <p key={`p-${paragraphs.length}`} className="mb-4">
                                {currentParagraph.map((text, i) => (
                                  <React.Fragment key={i}>
                                    {i > 0 && <br />}
                                    {text}
                                  </React.Fragment>
                                ))}
                              </p>
                            );
                          }

                          return <>{paragraphs}</>;
                        };
                        try {
                          const json = JSON.parse(active.contentJson);
                          return renderJSON(json.content);
                        } catch {
                          // fallback: render plain content with markdown headings and links
                          return renderMarkdownHeadings(active.content ?? "");
                        }
                      })()
                    : (() => {
                        // Always use renderMarkdownHeadings for plain text content
                        const renderMarkdownHeadings = (text: string) => {
                          const lines = text.split("\n");
                          const paragraphs: React.ReactNode[] = [];
                          let currentParagraph: string[] = [];

                          lines.forEach((line, idx) => {
                            const trimmed = line.trim();

                            // Handle headings
                            if (trimmed.startsWith("### ")) {
                              if (currentParagraph.length > 0) {
                                paragraphs.push(
                                  <p key={`p-${paragraphs.length}`} className="mb-4">
                                    {currentParagraph.map((text, i) => (
                                      <React.Fragment key={i}>
                                        {i > 0 && <br />}
                                        {text}
                                      </React.Fragment>
                                    ))}
                                  </p>
                                );
                                currentParagraph = [];
                              }
                              paragraphs.push(
                                <h3 key={idx} className="mt-6 first:mt-0">
                                  {trimmed.replace(/^###\s+/, "")}
                                </h3>
                              );
                            } else if (trimmed.startsWith("## ")) {
                              if (currentParagraph.length > 0) {
                                paragraphs.push(
                                  <p key={`p-${paragraphs.length}`} className="mb-4">
                                    {currentParagraph.map((text, i) => (
                                      <React.Fragment key={i}>
                                        {i > 0 && <br />}
                                        {text}
                                      </React.Fragment>
                                    ))}
                                  </p>
                                );
                                currentParagraph = [];
                              }
                              paragraphs.push(
                                <h2 key={idx} className="mt-6 first:mt-0">
                                  {trimmed.replace(/^##\s+/, "")}
                                </h2>
                              );
                            } else if (trimmed.startsWith("# ")) {
                              if (currentParagraph.length > 0) {
                                paragraphs.push(
                                  <p key={`p-${paragraphs.length}`} className="mb-4">
                                    {currentParagraph.map((text, i) => (
                                      <React.Fragment key={i}>
                                        {i > 0 && <br />}
                                        {text}
                                      </React.Fragment>
                                    ))}
                                  </p>
                                );
                                currentParagraph = [];
                              }
                              paragraphs.push(
                                <h1 key={idx} className="mt-6 first:mt-0">
                                  {trimmed.replace(/^#\s+/, "")}
                                </h1>
                              );
                            } else if (trimmed === "") {
                              // Empty line - end current paragraph and add spacing
                              if (currentParagraph.length > 0) {
                                paragraphs.push(
                                  <p key={`p-${paragraphs.length}`} className="mb-4">
                                    {currentParagraph.map((text, i) => (
                                      <React.Fragment key={i}>
                                        {i > 0 && <br />}
                                        {text}
                                      </React.Fragment>
                                    ))}
                                  </p>
                                );
                                currentParagraph = [];
                              }
                              // Add a spacer div for empty lines to create visual separation
                              paragraphs.push(<div key={`spacer-${paragraphs.length}`} className="h-4" />);
                            } else {
                              // Check for markdown links [text](url) in the line
                              const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                              let processedLine = line;
                              const links: { text: string; url: string; index: number }[] = [];
                              let match;

                              while ((match = linkRegex.exec(line)) !== null) {
                                links.push({
                                  text: match[1],
                                  url: match[2],
                                  index: match.index
                                });
                              }

                              if (links.length > 0) {
                                // Replace markdown links with React elements
                                const parts: (string | React.ReactNode)[] = [];
                                let lastIndex = 0;

                                links.forEach((link, linkIdx) => {
                                  // Add text before the link
                                  if (link.index > lastIndex) {
                                    parts.push(line.slice(lastIndex, link.index));
                                  }

                                  // Add the link
                                  parts.push(
                                    <a
                                      key={`link-${idx}-${linkIdx}`}
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary underline hover:text-primary/80"
                                    >
                                      {link.text}
                                    </a>
                                  );

                                  lastIndex = link.index + match![0].length;
                                });

                                // Add remaining text after the last link
                                if (lastIndex < line.length) {
                                  parts.push(line.slice(lastIndex));
                                }

                                currentParagraph.push(
                                  <span key={`text-with-links-${idx}`}>
                                    {parts}
                                  </span>
                                );
                              } else {
                                // Regular line without links
                                currentParagraph.push(line);
                              }
                            }
                          });

                          // Handle any remaining content
                          if (currentParagraph.length > 0) {
                            paragraphs.push(
                              <p key={`p-${paragraphs.length}`} className="mb-4">
                                {currentParagraph.map((text, i) => (
                                  <React.Fragment key={i}>
                                    {i > 0 && <br />}
                                    {text}
                                  </React.Fragment>
                                ))}
                              </p>
                            );
                          }

                          return <>{paragraphs}</>;
                        };
                        return renderMarkdownHeadings(
                          typeof active.content === "string"
                            ? active.content
                            : "",
                        );
                      })()}
                </article>
                {/* Bottom navigation: previous on left, mark as completed/next on right */}
                {(() => {
                  const currentIdx = lessons.findIndex(
                    (l) => l.id === active.id,
                  );
                  const prevLesson =
                    currentIdx > 0 ? lessons[currentIdx - 1] : null;
                  const nextLesson =
                    currentIdx >= 0 && currentIdx < lessons.length - 1
                      ? lessons[currentIdx + 1]
                      : null;
                  const isCompleted = optimisticIds.includes(active.id);

                  return (
                    <div className="mt-8 flex w-full flex-row items-end justify-between">
                      {/* Previous Lesson Button */}
                      <button
                        className="bg-muted text-muted-foreground hover:bg-accent rounded-md px-4 py-2 font-semibold shadow transition disabled:opacity-50"
                        onClick={() => {
                          if (prevLesson) {
                            setActiveId(prevLesson.id);
                            // Update URL to include lesson parameter for refresh persistence
                            const url = new URL(window.location.href);
                            url.searchParams.set('lesson', prevLesson.id);
                            window.history.replaceState({}, '', url.toString());
                          }
                        }}
                        disabled={!prevLesson}
                      >
                        Previous Lesson
                      </button>
                      {/* Next Button: always primary style, marks as completed if needed */}
                      <button
                        className="bg-primary text-primary-foreground hover:bg-primary/80 rounded-md px-4 py-2 font-semibold shadow transition"
                        onClick={() => {
                          if (!isCompleted) {
                            setOptimisticCompletedIds([
                              ...optimisticIds,
                              active.id,
                            ]);
                            markCompleted.mutate({ lessonId: active.id });
                          }
                          if (nextLesson) {
                            setActiveId(nextLesson.id);
                            // Update URL to include lesson parameter for refresh persistence
                            const url = new URL(window.location.href);
                            url.searchParams.set('lesson', nextLesson.id);
                            window.history.replaceState({}, '', url.toString());
                          }
                        }}
                        disabled={false}
                      >
                        {nextLesson ? "Next" : "Next"}
                      </button>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="text-muted-foreground text-sm">
                Select a lesson from the sidebar to begin.
              </div>
            )}
            {/* END ARTICLE */}
          </div>
        </main>
      </div>
  </>);

  return content;
}
