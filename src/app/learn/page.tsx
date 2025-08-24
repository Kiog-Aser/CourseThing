"use client";

import React, { useMemo, useState } from "react";
import {
  PlayCircle,
  BookOpenText,
  CheckCircle2,
  Loader2,
  TriangleAlert,
  Lock,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";

/* -------------------------------------------------------------------------- */
/* Types (learner side simplified)                                            */
/* -------------------------------------------------------------------------- */

type LessonRecord = {
  id: string;
  slug: string;
  title: string;
  kind: "VIDEO" | "TEXT";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  content: string | null;
  contentJson: string | null;
  youtubeId: string | null;
  order: number;
};

type CourseRecord = {
  id: string;
  slug: string;
  title: string;
  language: string;
  description: string | null;
  lessons: LessonRecord[];
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
        const inner = renderJSON(node.content, key);
        const textOnly = collectText(node).trim();
        if (!textOnly && !inner) {
          out.push(<p key={key} className="h-4" />);
        } else {
          out.push(<p key={key}>{inner}</p>);
        }
        break;
      }
      case "heading": {
        const level = Math.min(Math.max(node.attrs?.level ?? 2, 1), 3);
        const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
        out.push(
          <HeadingTag key={key} className="mt-6 first:mt-0">
            {renderJSON(node.content, key)}
          </HeadingTag>,
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
            className="bg-muted rounded-md px-3 py-2 text-xs leading-snug"
          >
            <code>{collectText(node)}</code>
          </pre>,
        );
        break;
      case "horizontalRule":
        out.push(<hr key={key} className="my-6" />);
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
  const courseSlug = search.get("course")?.trim() || "";

  const courseQuery = api.course.bySlug.useQuery(
    { slug: courseSlug },
    { enabled: !!courseSlug },
  );

  const course: CourseRecord | undefined = courseQuery.data as any;

  const lessons = useMemo<LessonRecord[]>(() => {
    if (!course) return [];
    return [...course.lessons]
      .filter((l) => l.status === "PUBLISHED")
      .sort((a, b) => a.order - b.order);
  }, [course]);

  const [activeId, setActiveId] = useState<string | null>(null);

  React.useEffect(() => {
    if (lessons.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !lessons.find((l) => l.id === activeId)) {
      setActiveId(lessons[0]!.id);
    }
  }, [lessons, activeId]);

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
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="text-muted-foreground animate-spin" />
        <p className="text-muted-foreground text-xs">
          Loading course "{courseSlug}"...
        </p>
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

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-muted/30 w-full border-b p-4 md:w-72 md:border-r md:border-b-0">
        <div className="mb-4">
          <h2 className="text-muted-foreground text-sm font-medium tracking-wide">
            {course.title}
          </h2>
          <p className="text-muted-foreground mt-1 line-clamp-3 text-[11px] leading-snug">
            {course.description || "No description provided."}
          </p>
        </div>
        <nav className="space-y-1">
          {lessons.map((lesson, idx) => {
            const isActive = lesson.id === activeId;
            const isVideo = lesson.kind === "VIDEO" || !!lesson.youtubeId;
            const locked = !isAuthed && idx > 0;
            return (
              <button
                key={lesson.id}
                onClick={() => {
                  if (locked) {
                    setLockedAttempt(lesson);
                    // Always jump back to the first lesson so preview remains accessible.
                    setActiveId(lessons[0]?.id ?? null);
                    return;
                  }
                  setLockedAttempt(null);
                  setActiveId(lesson.id);
                }}
                className={
                  "group flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left text-[13px] transition " +
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
                  <span className="text-muted-foreground/70 block text-[9px] tracking-wide uppercase">
                    {locked ? "Login required" : isVideo ? "Video" : "Lesson"}
                  </span>
                </span>
                {locked ? (
                  <Lock
                    size={16}
                    className={
                      "mt-0.5 opacity-70 group-hover:opacity-100 " +
                      (isActive ? "text-primary" : "text-muted-foreground")
                    }
                  />
                ) : isVideo ? (
                  <PlayCircle
                    size={16}
                    className={
                      "mt-0.5 opacity-70 group-hover:opacity-100 " +
                      (isActive ? "text-primary" : "text-muted-foreground")
                    }
                  />
                ) : (
                  <BookOpenText
                    size={16}
                    className={
                      "mt-0.5 opacity-70 group-hover:opacity-100 " +
                      (isActive ? "text-primary" : "text-muted-foreground")
                    }
                  />
                )}
                {false && (
                  <CheckCircle2 size={16} className="mt-0.5 text-emerald-500" />
                )}
              </button>
            );
          })}

          {lessons.length === 0 && (
            <div className="text-muted-foreground text-xs">
              No published lessons yet.
            </div>
          )}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {lockedAttempt ? (
            <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-5 text-center">
              <Lock className="text-muted-foreground h-10 w-10" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">
                  Sign in to continue
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  You need to be signed in to access the rest of this free
                  course. Create a free account or sign in to unlock all
                  lessons.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
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
                <button
                  onClick={() => setLockedAttempt(null)}
                  className="text-muted-foreground text-xs underline-offset-4 hover:underline"
                >
                  Back to first lesson
                </button>
              </div>
            </div>
          ) : active ? (
            <>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl leading-tight font-bold tracking-tight md:text-3xl">
                  {active.title}
                </h1>
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
                      try {
                        const json = JSON.parse(active.contentJson);
                        return renderJSON(json.content);
                      } catch {
                        return (
                          <p className="text-muted-foreground text-sm">
                            Could not parse lesson content.
                          </p>
                        );
                      }
                    })()
                  : active.content
                      ?.split(/\n\n+/)
                      .map((para, i) => <p key={i}>{para}</p>)}
              </article>
            </>
          ) : (
            <div className="text-muted-foreground text-sm">
              Select a lesson from the sidebar to begin.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
