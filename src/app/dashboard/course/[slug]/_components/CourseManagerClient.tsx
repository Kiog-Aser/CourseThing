"use client";

import React from "react";
import { api } from "~/trpc/react";
import { Plus, Loader2, Rocket, Trash2 } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

/* Video / status concepts removed – all lessons are plain text and implicitly published */

export interface LessonData {
  id: string;
  slug: string;
  title: string;
  content: string;
  contentJson: string;
  order: number;
}

export interface CourseData {
  id: string;
  slug: string;
  title: string;
  language: string;
  description: string;
  lessons: LessonData[];
}

export interface CourseManagerClientProps {
  slug: string;
  initialCourse: CourseData;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeSlug(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

/* YouTube embed auto-detection (paste a YouTube URL to embed) */

/* -------------------------------------------------------------------------- */
/* TipTap (lazy import to avoid build errors if deps missing initially)       */
/* -------------------------------------------------------------------------- */

const TipTapEditor = React.lazy(async () => {
  const { useEditor, EditorContent } = await import("@tiptap/react");
  const StarterKit = (await import("@tiptap/starter-kit")).default;
  const Placeholder = (await import("@tiptap/extension-placeholder")).default;

  interface EditorWrapperProps {
    json: Record<string, any>;
    onUpdate: (json: Record<string, any>, text: string) => void;
    editable: boolean;
  }
  function EditorWrapper(props: EditorWrapperProps) {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Placeholder.configure({
          placeholder: "Start writing your lesson...",
        }),
      ],
      content: props.json,
      editable: props.editable,
      onUpdate: ({ editor }) => {
        props.onUpdate(editor.getJSON(), editor.getText());
      },
    });

    React.useEffect(() => {
      if (editor) editor.setEditable(props.editable);
    }, [props.editable, editor]);

    // (YouTube auto-embed disabled; raw pasted URLs remain as text for front-end render-time iframe detection)

    return (
      <div className="min-h-[500px] cursor-text rounded-md py-4">
        <EditorContent
          editor={editor}
          className="prose dark:prose-invert min-h-[400px] max-w-none border-0 px-0 text-base ring-0 outline-none focus:outline-none [&_.ProseMirror]:border-0 [&_.ProseMirror]:ring-0 [&_.ProseMirror]:outline-none [&_.ProseMirror_h1]:mt-0 [&_.ProseMirror_h2]:mt-0 [&_.ProseMirror_p]:m-0"
        />
      </div>
    );
  }

  return {
    default: EditorWrapper,
  };
});

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function CourseManagerClient({
  slug,
  initialCourse,
}: CourseManagerClientProps) {
  const utils = api.useUtils();

  const courseQuery = api.course.bySlug.useQuery(
    { slug },
    { initialData: initialCourse },
  );

  const updateCourse = api.course.update.useMutation({
    onSuccess: () => void utils.course.bySlug.invalidate({ slug }),
  });
  const addLesson = api.course.addLesson.useMutation({
    onSuccess: (data) =>
      void utils.course.bySlug.invalidate({ slug }).then(() => {
        setActiveLessonId(data.id);
      }),
  });
  const updateLesson = api.course.updateLesson.useMutation({
    onSuccess: () => void utils.course.bySlug.invalidate({ slug }),
  });
  const deleteLesson = api.course.deleteLesson.useMutation({
    onSuccess: () => void utils.course.bySlug.invalidate({ slug }),
  });

  /* ------------------------------- State ----------------------------------- */

  const course = courseQuery.data;
  const lessonsSorted =
    [...(course?.lessons ?? [])].sort((a, b) => a.order - b.order) ?? [];

  const [activeLessonId, setActiveLessonId] = React.useState<string | null>(
    lessonsSorted[0]?.id ?? null,
  );

  // Track local draft states for debounced saves
  const [courseTitle, setCourseTitle] = React.useState(course?.title ?? "");
  const [courseTitleDirty, setCourseTitleDirty] = React.useState(false);

  React.useEffect(() => {
    setCourseTitle(course?.title ?? "");
    setCourseTitleDirty(false);
  }, [course?.id]);

  // Active lesson local state
  const activeLesson =
    lessonsSorted.find((l) => l.id === activeLessonId) ?? null;
  const [lessonMeta, setLessonMeta] = React.useState<{
    id: string | null;
    title: string;
    dirty: boolean;
  }>({
    id: activeLesson?.id ?? null,
    title: activeLesson?.title ?? "",
    dirty: false,
  });

  React.useEffect(() => {
    if (!activeLesson) return;
    setLessonMeta({
      id: activeLesson.id,
      title: activeLesson.title,
      dirty: false,
    });
  }, [activeLesson?.id]);

  // Lesson content tracking (JSON + dirty flag)
  const [editorJson, setEditorJson] = React.useState<any>(null);
  const [editorDirty, setEditorDirty] = React.useState(false);
  React.useEffect(() => {
    if (!activeLesson) {
      setEditorJson(null);
      return;
    }
    if (activeLesson.contentJson) {
      try {
        setEditorJson(JSON.parse(activeLesson.contentJson));
      } catch {
        setEditorJson({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: activeLesson.content ?? "" }],
            },
          ],
        });
      }
    } else if (activeLesson.content) {
      setEditorJson({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: activeLesson.content }],
          },
        ],
      });
    } else {
      setEditorJson({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "" }],
          },
        ],
      });
    }
    setEditorDirty(false);
  }, [activeLesson?.id]);

  /* --------------------------- Debounced Saves ----------------------------- */

  // Course title auto-save
  React.useEffect(() => {
    if (!course || !courseTitleDirty) return;
    const handle = setTimeout(() => {
      updateCourse.mutate({
        id: course.id,
        title: courseTitle.trim() || "Untitled Course",
        slug: normalizeSlug(courseTitle.trim() || "untitled-course"),
        language: course.language,
        description: course.description ?? "",
      });
      setCourseTitleDirty(false);
    }, 800);
    return () => clearTimeout(handle);
  }, [courseTitle, courseTitleDirty]);

  // Lesson meta auto-save
  React.useEffect(() => {
    if (!activeLesson || !lessonMeta.dirty) return;
    const handle = setTimeout(() => {
      updateLesson.mutate({
        id: activeLesson.id,
        data: {
          title: lessonMeta.title.trim() || "Untitled",
          slug: normalizeSlug(lessonMeta.title.trim() || "untitled"),
          content: undefined,
          contentJson: undefined,
        },
      });
      setLessonMeta((m) => ({ ...m, dirty: false }));
    }, 700);
    return () => clearTimeout(handle);
  }, [lessonMeta.title, lessonMeta.dirty, activeLesson?.id]);

  // Editor content auto-save
  React.useEffect(() => {
    if (!activeLesson || !editorDirty) return;
    const handle = setTimeout(() => {
      updateLesson.mutate({
        id: activeLesson.id,
        data: {
          contentJson: JSON.stringify(editorJson),
          content: "", // plain fallback not needed for now
        },
      });
      setEditorDirty(false);
    }, 1200);
    return () => clearTimeout(handle);
  }, [editorJson, editorDirty, activeLesson?.id]);

  /* --------------------------- Lesson Operations --------------------------- */

  function generateUntitledSlug(base = "untitled") {
    const existing = new Set(lessonsSorted.map((l) => l.slug));
    if (!existing.has(base)) return base;
    let i = 2;
    while (existing.has(`${base}-${i}`)) i++;
    return `${base}-${i}`;
  }

  function handleCreateLesson() {
    if (!course) return;
    const order = lessonsSorted.length;
    const slugBase = generateUntitledSlug("lesson");
    addLesson.mutate({
      courseId: course.id,
      data: {
        title: "Untitled",
        slug: slugBase,
        kind: "TEXT",
        status: "PUBLISHED",
        content: "",
        contentJson: "",
        youtubeId: "",
        order,
      },
    });
  }

  /* Drag & drop reordering */
  const [draggingLessonId, setDraggingLessonId] = React.useState<string | null>(
    null,
  );

  function reorderLessons(ids: string[]) {
    ids.forEach((id, index) => {
      const lesson = lessonsSorted.find((l) => l.id === id);
      if (lesson && lesson.order !== index) {
        updateLesson.mutate({ id: lesson.id, data: { order: index } });
      }
    });
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggingLessonId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, _overId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, dropId: string) {
    e.preventDefault();
    if (!draggingLessonId || draggingLessonId === dropId) return;
    const ids = lessonsSorted.map((l) => l.id);
    const from = ids.indexOf(draggingLessonId);
    const to = ids.indexOf(dropId);
    if (from === -1 || to === -1) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    reorderLessons(ids);
    setDraggingLessonId(null);
  }

  function removeLesson(id: string) {
    if (!confirm("Delete this lesson?")) return;
    deleteLesson.mutate({ id });
    if (activeLessonId === id) {
      setActiveLessonId(
        lessonsSorted.filter((l) => l.id !== id)[0]?.id ?? null,
      );
    }
  }

  /* ---------------------------- Publish Course ----------------------------- */
  const [publishing, setPublishing] = React.useState(false);
  const unpublishedCount = 0; // all lessons implicitly published

  function publishCourse() {
    alert("All lessons are already considered published.");
  }

  /* ------------------------------- Rendering -------------------------------- */

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="bg-muted/30 w-full border-b p-4 md:w-72 md:border-r md:border-b-0">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex-1">
            <input
              value={courseTitle}
              onChange={(e) => {
                setCourseTitle(e.target.value);
                setCourseTitleDirty(true);
              }}
              placeholder="Course title..."
              className="focus:bg-background/40 w-full rounded-md bg-transparent px-3 py-1 text-sm font-semibold outline-none"
            />
          </div>
        </div>

        <nav className="space-y-1">
          {lessonsSorted.map((lesson, idx) => {
            const isActive = lesson.id === activeLessonId;
            return (
              <div
                key={lesson.id}
                draggable
                onDragStart={(e) => handleDragStart(e, lesson.id)}
                onDragOver={(e) => handleDragOver(e, lesson.id)}
                onDrop={(e) => handleDrop(e, lesson.id)}
                onClick={() => setActiveLessonId(lesson.id)}
                className={
                  "group cursor-pointer rounded-md border px-3 py-2 text-sm " +
                  (isActive
                    ? "border-primary bg-primary/10"
                    : "hover:border-accent hover:bg-accent border-transparent")
                }
              >
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5 cursor-grab text-xs font-semibold select-none">
                    ⋮⋮
                  </span>
                  <span
                    className={
                      "flex-1 truncate text-xs " +
                      (isActive ? "text-primary font-medium" : "")
                    }
                  >
                    {idx + 1}. {lesson.title || "Untitled"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLesson(lesson.id);
                    }}
                    className="hover:bg-destructive/10 border-destructive/50 text-destructive rounded border px-1.5 py-0.5 text-[10px] opacity-0 transition group-hover:opacity-100"
                    title="Delete lesson"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}

          {lessonsSorted.length === 0 && (
            <div className="text-muted-foreground text-xs">No lessons yet.</div>
          )}

          <button
            onClick={() => handleCreateLesson()}
            disabled={addLesson.status === "pending"}
            className="text-foreground hover:bg-accent group flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm font-medium"
          >
            <Plus
              size={16}
              className="text-muted-foreground group-hover:text-foreground"
            />
            {addLesson.status === "pending" ? "Creating..." : "Add Lesson"}
          </button>

          <div className="mt-6 space-y-2">
            <button
              onClick={publishCourse}
              disabled={publishing || unpublishedCount === 0}
              className="bg-primary text-primary-foreground inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium disabled:opacity-50"
            >
              {publishing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Rocket size={14} />
              )}
              {unpublishedCount === 0
                ? "Course Published"
                : publishing
                  ? "Publishing..."
                  : `Publish Course (${unpublishedCount} draft${
                      unpublishedCount > 1 ? "s" : ""
                    })`}
            </button>
          </div>
        </nav>
      </aside>

      {/* Main editing panel */}
      <main className="flex-1 overflow-y-auto p-6">
        {activeLesson ? (
          <div className="mx-auto max-w-3xl space-y-6">
            {/* Inline title */}
            <div className="space-y-2">
              <input
                value={lessonMeta.title}
                onChange={(e) =>
                  setLessonMeta((m) => ({
                    ...m,
                    title: e.target.value,
                    dirty: true,
                  }))
                }
                placeholder="Untitled lesson"
                className="w-full bg-transparent text-3xl font-bold tracking-tight outline-none"
              />
              <div className="text-muted-foreground text-[10px] tracking-wide uppercase">
                {lessonMeta.dirty || updateLesson.status === "pending"
                  ? "Saving..."
                  : "Saved"}
              </div>
            </div>

            {/* (Video input removed) */}

            {/* Text Editor */}
            {true && (
              <div className="relative">
                <React.Suspense
                  fallback={
                    <div className="text-muted-foreground text-sm">
                      Loading editor...
                    </div>
                  }
                >
                  <TipTapEditor
                    json={editorJson}
                    editable
                    onUpdate={(json) => {
                      setEditorJson(json);
                      setEditorDirty(true);
                    }}
                  />
                </React.Suspense>
              </div>
            )}

            {/* All lessons are plain text; no toggles */}
          </div>
        ) : (
          <div className="text-muted-foreground mx-auto max-w-xl pt-20 text-center text-sm">
            Select or create a lesson to begin.
          </div>
        )}
      </main>
    </div>
  );
}

export default CourseManagerClient;
