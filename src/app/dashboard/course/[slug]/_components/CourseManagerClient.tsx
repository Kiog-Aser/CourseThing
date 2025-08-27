"use client";

import React from "react";
import { api } from "~/trpc/react";
import { truncateWords } from "~/lib/utils";
import {
  Plus,
  Loader2,
  Rocket,
  Trash2,
  CheckCircle,
  Circle,
  Folder,
  Edit,
} from "lucide-react";
import { FileUpload } from "~/components/ui";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

/* Video / status concepts removed – all lessons are plain text and implicitly published */

import type { RouterOutputs } from "~/trpc/react";

type LessonWithDescription = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  kind: "VIDEO" | "TEXT";
  status: string;
  content?: string | null;
  contentJson?: string | null;
  youtubeId?: string | null;
  order: number;
  chapterId?: string | null;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
};

type ChapterData = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  poster?: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  lessons: LessonWithDescription[];
};

type CourseData = {
  id: string;
  slug: string;
  title: string;
  language: string;
  description?: string | null;
  poster?: string | null;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  lessons: LessonWithDescription[];
  chapters: ChapterData[];
};

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
  const Image = (await import("@tiptap/extension-image")).default;
  const Link = (await import("@tiptap/extension-link")).default;

  // Helper to remove heading input rule from StarterKit
  function removeHeadingInputRule(extensions: any[]) {
    return extensions.map((ext) => {
      if (ext.name === "heading" && ext.inputRules) {
        // Remove inputRules so # is not converted to heading
        return {
          ...ext,
          inputRules: () => [],
        };
      }
      return ext;
    });
  }

  interface EditorWrapperProps {
    json: Record<string, unknown>;
    onUpdate: (json: Record<string, unknown>, text: string) => void;
    editable: boolean;
  }

  // Helper function to upload image and return URL
  async function uploadImage(file: File): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Image upload failed:', error);
      return null;
    }
  }
  function EditorWrapper(props: EditorWrapperProps) {
    const starterKit = StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    });
    // Remove heading input rule so # stays as text
    const extensions = removeHeadingInputRule([
      starterKit,
      Placeholder.configure({
        placeholder: "Start writing your lesson...",
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
        },
      }),
    ]);

    const editor = useEditor({
      extensions,
      content: props.json,
      editable: props.editable,
      onUpdate: ({ editor }) => {
        props.onUpdate(editor.getJSON(), editor.getText());
      },
    });

    // Keep editor content in sync when the provided JSON changes
    React.useEffect(() => {
      if (!editor) return;
      try {
        const current = editor.getJSON();
        const next = props.json;
        if (JSON.stringify(current) !== JSON.stringify(next)) {
          editor.commands.setContent(next as any, false);
        }
      } catch {
        // Fallback if comparison fails
        editor.commands.setContent(props.json as any, false);
      }
    }, [props.json, editor]);

    // Handle file drop
    const handleDrop = React.useCallback(async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const files = Array.from(event.dataTransfer.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));

      if (imageFiles.length > 0 && editor) {
        for (const file of imageFiles) {
          const url = await uploadImage(file);
          if (url) {
            editor.chain().focus().setImage({ src: url, alt: file.name }).run();
          }
        }
      }
    }, [editor]);

    // Handle file paste
    const handlePaste = React.useCallback(async (event: React.ClipboardEvent) => {
      const files = Array.from(event.clipboardData.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));

      if (imageFiles.length > 0 && editor) {
        event.preventDefault();
        for (const file of imageFiles) {
          const url = await uploadImage(file);
          if (url) {
            editor.chain().focus().setImage({ src: url, alt: file.name }).run();
          }
        }
      }
    }, [editor]);

    // Handle drag over to allow drop
    const handleDragOver = React.useCallback((event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
    }, []);

    React.useEffect(() => {
      if (editor) editor.setEditable(props.editable);
    }, [props.editable, editor]);

    // (YouTube auto-embed disabled; raw pasted URLs remain as text for front-end render-time iframe detection)

    return (
      <div className="min-h-[500px] cursor-text rounded-md py-4">
        <EditorContent
          editor={editor}
          onDrop={handleDrop}
          onPaste={handlePaste}
          onDragOver={handleDragOver}
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

  // --- Lesson Completion State ---
  // Only fetch completion/progress for learners (not admins/creators)
  const [isLearner, setIsLearner] = React.useState(false);

  React.useEffect(() => {
    // Simple heuristic: if window exists and no admin flag in localStorage/session, treat as learner
    // You may want to replace this with a more robust role check from session/user context
    if (typeof window !== "undefined") {
      setIsLearner(!window.location.pathname.includes("/dashboard"));
    }
  }, []);

  const courseId = initialCourse.id;
  const { data: completedLessonIds = [], refetch: refetchCompletions } =
    api.course.getLessonCompletions.useQuery(
      { courseId },
      { enabled: !!courseId && isLearner },
    );

  const markCompleted = api.course.markLessonCompleted.useMutation({
    onSuccess: () => refetchCompletions(),
  });
  const unmarkCompleted = api.course.unmarkLessonCompleted.useMutation({
    onSuccess: () => refetchCompletions(),
  });

  // Progress calculation
  const totalLessons = initialCourse.lessons.length;
  const completedCount = completedLessonIds.length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const courseQuery = api.course.bySlug.useQuery({ slug });

  const updateCourse = api.course.update.useMutation({
    onSuccess: () => void utils.course.bySlug.invalidate({ slug }),
  });
  const addLesson = api.course.addLesson.useMutation({
    onSuccess: (data) =>
      Promise.all([
        utils.course.bySlug.invalidate({ slug }),
        utils.course.listChapters.invalidate({ courseId: initialCourse.id }),
      ]).then(() => {
        setActiveLessonId(data.id);
      }),
  });
  const updateLesson = api.course.updateLesson.useMutation({
    onSuccess: () => {
      void utils.course.bySlug.invalidate({ slug });
      void utils.course.listChapters.invalidate({ courseId: initialCourse.id });
    },
  });
  const deleteLesson = api.course.deleteLesson.useMutation({
    onSuccess: () => {
      console.log("Delete lesson mutation successful");
      void utils.course.bySlug.invalidate({ slug });
      void utils.course.listChapters.invalidate({ courseId: initialCourse.id });
    },
    onError: (error) => {
      console.error("Delete lesson mutation failed:", error);
    },
  });

  // Chapter operations
  const chaptersQuery = api.course.listChapters.useQuery(
    { courseId: initialCourse.id },
    {
      // Shape initial data to exactly match the listChapters output type
      initialData: initialCourse.chapters.map((chapter) => ({
        id: chapter.id,
        slug: chapter.slug,
        title: chapter.title,
        description: chapter.description ?? null,
        poster: chapter.poster ?? null,
        courseId: initialCourse.id,
        order: chapter.order,
        createdAt: chapter.createdAt,
        updatedAt: chapter.updatedAt,
        lessons: chapter.lessons.map((l) => ({
          id: l.id,
          slug: l.slug,
          title: l.title,
          description: l.description ?? null,
          kind: l.kind,
          status: l.status as any,
          order: l.order,
          chapterId: l.chapterId ?? null,
          createdAt: l.createdAt,
        })),
      })),
    },
  );
  // Chapter collapse / expand state
  const [expandedChapters, setExpandedChapters] = React.useState<Set<string>>(
    new Set(),
  );
  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };
  const createChapter = api.course.createChapter.useMutation({
    onSuccess: () => {
      void utils.course.listChapters.invalidate({ courseId: initialCourse.id });
      void utils.course.bySlug.invalidate({ slug });
    },
  });
  const updateChapter = api.course.updateChapter.useMutation({
    onSuccess: () => {
      void utils.course.listChapters.invalidate({ courseId: initialCourse.id });
      void utils.course.bySlug.invalidate({ slug });
    },
  });
  const deleteChapter = api.course.deleteChapter.useMutation({
    onSuccess: () => {
      void utils.course.listChapters.invalidate({ courseId: initialCourse.id });
      void utils.course.bySlug.invalidate({ slug });
    },
  });
  const reorderChapters = api.course.reorderChapters.useMutation({
    onSuccess: () => {
      void utils.course.listChapters.invalidate({ courseId: initialCourse.id });
      void utils.course.bySlug.invalidate({ slug });
    },
  });

  /* ------------------------------- State ----------------------------------- */

  const course: CourseData | undefined = courseQuery.data as
    | CourseData
    | undefined;
  const lessonsSorted: LessonWithDescription[] =
    [...(course?.lessons ?? [])]
      .filter((l) => !l.chapterId)
      .sort((a, b) => a.order - b.order) ?? [];
  const chaptersSorted = [...(chaptersQuery.data ?? [])].sort(
    (a, b) => a.order - b.order,
  );

  const [activeLessonId, setActiveLessonId] = React.useState<string | null>(
    lessonsSorted[0]?.id ?? null,
  );

  // Chapter management state
  const [showChapterForm, setShowChapterForm] = React.useState(false);
  const [editingChapterId, setEditingChapterId] = React.useState<string | null>(
    null,
  );
  const [chapterForm, setChapterForm] = React.useState({
    title: "",
    slug: "",
    description: "",
    poster: "",
  });

  // Track local draft states for debounced saves
  const [courseTitle, setCourseTitle] = React.useState(course?.title ?? "");
  const [courseTitleDirty, setCourseTitleDirty] = React.useState(false);

  React.useEffect(() => {
    setCourseTitle(course?.title ?? "");
    setCourseTitleDirty(false);
  }, [course?.id]);

  // Aggregate all lessons (standalone + chapter lessons)
  const allLessons: LessonWithDescription[] = React.useMemo(() => {
    if (!course) return [];
    return [
      ...lessonsSorted,
      ...course.chapters.flatMap((ch) => ch.lessons as LessonWithDescription[]),
    ];
  }, [course, lessonsSorted]);

  // Active lesson local state
  const activeLesson = allLessons.find((l) => l.id === activeLessonId) ?? null;

  const [lessonMeta, setLessonMeta] = React.useState<{
    id: string | null;
    title: string;
    description: string;
    dirty: boolean;
  }>({
    id: activeLesson?.id ?? null,
    title: activeLesson?.title ?? "",
    description: activeLesson?.description ?? "",
    dirty: false,
  });

  React.useEffect(() => {
    if (!activeLesson) return;
    setLessonMeta({
      id: activeLesson.id,
      title: activeLesson.title,
      description: activeLesson.description ?? "",
      dirty: false,
    });
  }, [activeLesson?.id]);

  // Lesson content tracking (JSON + dirty flag)
  const [editorJson, setEditorJson] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [editorDirty, setEditorDirty] = React.useState(false);
  React.useEffect(() => {
    if (!activeLesson) {
      setEditorJson(null);
      return;
    }
    if (activeLesson.contentJson) {
      try {
        const parsed = JSON.parse(activeLesson.contentJson);
        if (typeof parsed === "object" && parsed !== null) {
          setEditorJson(parsed as Record<string, unknown>);
        } else {
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
          description: lessonMeta.description?.trim() || "",
          content: undefined,
          contentJson: undefined,
          // Preserve chapterId if the lesson belongs to a chapter
          ...(activeLesson.chapterId && { chapterId: activeLesson.chapterId }),
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
          // Preserve chapterId if the lesson belongs to a chapter
          ...(activeLesson.chapterId && { chapterId: activeLesson.chapterId }),
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

  function handleCreateLesson(chapterId?: string) {
    if (!course) return;
    const order = chapterId
      ? (course.chapters.find((c) => c.id === chapterId)?.lessons.length ?? 0)
      : lessonsSorted.length;
    const slugBase = generateUntitledSlug("lesson");
    addLesson.mutate({
      courseId: course.id,
      chapterId,
      data: {
        title: "Untitled",
        slug: slugBase,
        kind: "TEXT",
        status: "PUBLISHED",
        description: "",
        content: "",
        contentJson: "",
        youtubeId: "",
        order,
        chapterId,
      },
    });
  }

  /* Drag & drop reordering */
  const [draggingLessonId, setDraggingLessonId] = React.useState<string | null>(
    null,
  );

  function reorderLessons(ids: string[]) {
    if (!Array.isArray(lessonsSorted)) return;
    ids
      .filter((id): id is string => typeof id === "string")
      .forEach((id, index) => {
        const lesson = lessonsSorted.find((l) => l.id === id);
        if (lesson && lesson.order !== index) {
          updateLesson.mutate({ id: lesson.id, data: { order: index } });
        }
      });
  }

  function handleDragStart(e: React.DragEvent, id: string | undefined) {
    if (typeof id === "string") {
      setDraggingLessonId(id);
      e.dataTransfer.setData("text/plain", id);
    }
    e.dataTransfer.effectAllowed = "copy";
  }

  function handleDragOver(e: React.DragEvent, _overId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(e: React.DragEvent, dropId: string | undefined) {
    e.preventDefault();
    if (
      typeof draggingLessonId !== "string" ||
      typeof dropId !== "string" ||
      draggingLessonId === dropId
    )
      return;

    // Check if we're dropping on a chapter
    const dropChapter = chaptersSorted.find((c) => c.id === dropId);
    if (dropChapter) {
      // Move lesson to chapter
      updateLesson.mutate({
        id: draggingLessonId,
        data: {
          chapterId: dropChapter.id,
          order: dropChapter.lessons.length, // Add to end of chapter
        },
      });
      setDraggingLessonId(null);
      return;
    }

    // Regular lesson reordering within same chapter
    const ids = lessonsSorted
      .map((l) => l.id)
      .filter((id): id is string => typeof id === "string");
    const from = ids.indexOf(draggingLessonId);
    const to = ids.indexOf(dropId);
    if (from === -1 || to === -1 || !draggingLessonId) return;
    const [removedId] = ids.splice(from, 1);
    if (removedId) {
      ids.splice(to, 0, removedId);
      reorderLessons(ids);
    }
    setDraggingLessonId(null);
  }

  function removeLesson(id: string) {
    if (!confirm("Delete this lesson?")) return;

    console.log("Deleting lesson:", id);
    deleteLesson.mutate({ id }, {
      onSuccess: () => {
        console.log("Lesson deleted successfully");
        if (activeLessonId === id) {
          const nextLesson = lessonsSorted.find((l) => l.id !== id);
          setActiveLessonId(nextLesson ? nextLesson.id : null);
        }
      },
      onError: (error) => {
        console.error("Failed to delete lesson:", error);
        alert("Failed to delete lesson. Please try again.");
      }
    });
  }

  /* --------------------------- Chapter Operations --------------------------- */

  function handleCreateChapter() {
    if (!course) return;
    setChapterForm({ title: "", slug: "", description: "", poster: "" });
    setEditingChapterId(null);
    setShowChapterForm(true);
  }

  function handleEditChapter(chapter: any) {
    setChapterForm({
      title: chapter.title,
      slug: chapter.slug,
      description: chapter.description || "",
      poster: chapter.poster || "",
    });
    setEditingChapterId(chapter.id);
    setShowChapterForm(true);
  }

  function handleChapterFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!course) return;

    const order = editingChapterId
      ? chaptersSorted.find((c) => c.id === editingChapterId)?.order || 0
      : chaptersSorted.length;

    if (editingChapterId) {
      updateChapter.mutate({
        id: editingChapterId,
        data: {
          ...chapterForm,
          order,
        },
      });
    } else {
      createChapter.mutate({
        courseId: course.id,
        data: {
          ...chapterForm,
          order,
        },
      });
    }

    setShowChapterForm(false);
  }

  function handleDeleteChapter(id: string) {
    if (
      !confirm(
        "Delete this chapter? All lessons in this chapter will be added to the main course.",
      )
    )
      return;
    deleteChapter.mutate({ id });
  }

  function handleChapterDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", id);
  }

  function handleChapterDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleChapterReorder(e: React.DragEvent, dropId: string) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === dropId) return;

    const draggedIndex = chaptersSorted.findIndex((c) => c.id === draggedId);

    // If the dragged item is NOT a chapter, treat it as a lesson being added to this chapter
    if (draggedIndex === -1) {
      updateLesson.mutate({
        id: draggedId,
        data: {
          chapterId: dropId,
          order:
            chaptersSorted.find((c) => c.id === dropId)?.lessons.length ?? 0,
        },
      });
      return;
    }

    const dropIndex = chaptersSorted.findIndex((c) => c.id === dropId);
    if (dropIndex === -1) return;

    const newOrder = [...chaptersSorted]
      .map((c) => c.id)
      .filter((id) => id !== draggedId);

    newOrder.splice(dropIndex, 0, draggedId);

    reorderChapters.mutate({
      courseId: initialCourse.id,
      chapterIds: newOrder,
    });
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
        {/* Progress Bar and completion UI only for learners */}
        {isLearner && (
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
        )}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
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
          {/* Chapter Form */}
          {showChapterForm && (
            <div className="bg-muted/50 mb-4 rounded-lg border p-3">
              <form onSubmit={handleChapterFormSubmit} className="space-y-3">
                <div className="space-y-1">
                  <input
                    value={chapterForm.title}
                    onChange={(e) =>
                      setChapterForm({ ...chapterForm, title: e.target.value })
                    }
                    placeholder="Chapter title"
                    className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <input
                    value={chapterForm.slug}
                    onChange={(e) =>
                      setChapterForm({
                        ...chapterForm,
                        slug: normalizeSlug(e.target.value),
                      })
                    }
                    placeholder="chapter-slug"
                    className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <textarea
                    value={chapterForm.description}
                    onChange={(e) =>
                      setChapterForm({
                        ...chapterForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Chapter description"
                    className="bg-background w-full resize-none rounded-md border px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
                <div className="space-y-1">
                  <FileUpload
                    currentImage={chapterForm.poster}
                    onUpload={(url) =>
                      setChapterForm({ ...chapterForm, poster: url })
                    }
                    placeholder="Upload chapter poster"
                    maxSizeText="5MB"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={
                      createChapter.status === "pending" ||
                      updateChapter.status === "pending"
                    }
                    className="bg-primary text-primary-foreground rounded px-3 py-1 text-xs font-medium"
                  >
                    {editingChapterId ? "Update" : "Create"} Chapter
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowChapterForm(false)}
                    className="rounded border px-3 py-1 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Chapters */}
          {chaptersSorted.map((chapter) => (
            <div key={chapter.id} className="space-y-1">
              <div
                draggable
                onDragStart={(e) => handleChapterDragStart(e, chapter.id)}
                onDragOver={handleChapterDragOver}
                onDrop={(e) => handleChapterReorder(e, chapter.id)}
                onClick={() => toggleChapter(chapter.id)}
                className="group border-muted-foreground/30 text-muted-foreground hover:border-primary/50 flex cursor-pointer items-start gap-2 rounded-md border border-dashed px-3 py-2 text-sm font-medium transition-colors"
              >
                <Folder size={14} />
                <span className="flex-1 min-w-0 truncate" title={chapter.title}>{chapter.title}</span>
                <span className="text-[10px] tracking-wide uppercase">
                  {expandedChapters.has(chapter.id) ? "Hide" : "Show"}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditChapter(chapter);
                  }}
                  className="hover:bg-muted rounded p-1 opacity-0 group-hover:opacity-100"
                >
                  <Edit size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChapter(chapter.id);
                  }}
                  className="hover:bg-destructive/10 text-destructive rounded p-1 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Chapter lessons */}
              {expandedChapters.has(chapter.id) &&
                chapter.lessons.map((lesson, idx) => {
                  const isActive = lesson.id === activeLessonId;
                  const isCompleted = completedLessonIds.includes(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lesson.id)}
                      onDragOver={(e) => handleDragOver(e, lesson.id)}
                      onDrop={(e) => handleDrop(e, lesson.id)}
                      onClick={() =>
                        setActiveLessonId(
                          typeof lesson.id === "string" ? lesson.id : null,
                        )
                      }
                      className={
                        "group mx-2 flex w-full cursor-pointer items-start rounded-md border px-2.5 py-2 text-sm " +
                        (isActive
                          ? "border-primary bg-primary/10"
                          : "hover:border-accent hover:bg-accent border-transparent")
                      }
                    >
                      <div className="flex flex-1 items-start gap-2 min-w-0">
                        <span className="text-muted-foreground mt-0.5 cursor-grab text-xs font-semibold select-none">
                          ⋮⋮
                        </span>
                        <span
                          className={
                            "flex-1 min-w-0 text-xs " +
                            (isActive ? "text-primary font-medium" : "")
                          }
                        >
                          <span className="block truncate" title={lesson.title || "Untitled"}>
                            {idx + 1}. {lesson.title || "Untitled"}
                          </span>
                          {lesson.description && (
                            <div
                              className="text-muted-foreground mt-0.5 text-[11px] leading-tight line-clamp-1"
                              title={lesson.description}
                            >
                              {truncateWords(lesson.description, 5)}
                            </div>
                          )}
                        </span>
                        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateLesson.mutate({
                                id: lesson.id,
                                data: {
                                  chapterId: null,
                                  order: lessonsSorted.length,
                                },
                              });
                            }}
                            className="hover:bg-muted rounded border px-1.5 py-0.5 text-[10px]"
                            title="Move to main course"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      {/* Completion toggle only for learners */}
                      {isLearner && (
                        <button
                          className="ml-2"
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
                        >
                          {isCompleted ? (
                            <CheckCircle size={18} className="text-green-500" />
                          ) : (
                            <Circle size={18} className="text-gray-400" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}

              <button
                onClick={() => handleCreateLesson(chapter.id)}
                disabled={addLesson.status === "pending"}
                className="text-foreground hover:bg-accent group mx-2 flex w-60 items-center gap-2 rounded-md border border-dashed px-2.5 py-2 text-sm font-medium"
              >
                <Plus
                  size={12}
                  className="text-muted-foreground group-hover:text-foreground"
                />
                {addLesson.status === "pending" ? "Creating..." : "Add Lesson"}
              </button>
            </div>
          ))}

          {/* Main course lessons */}
          {lessonsSorted.length > 0 && (
            <>
              {lessonsSorted.map((lesson, idx) => {
                const isActive = lesson.id === activeLessonId;
                const isCompleted = completedLessonIds.includes(lesson.id);
                return (
                  <div
                    key={lesson.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lesson.id)}
                    onDragOver={(e) => handleDragOver(e, lesson.id)}
                    onDrop={(e) => handleDrop(e, lesson.id)}
                    onClick={() =>
                      setActiveLessonId(
                        typeof lesson.id === "string" ? lesson.id : null,
                      )
                    }
                    className={
                      "group flex cursor-pointer items-start rounded-md border px-3 py-2 text-sm " +
                      (isActive
                        ? "border-primary bg-primary/10"
                        : "hover:border-accent hover:bg-accent border-transparent")
                    }
                  >
                    <div className="flex flex-1 items-start gap-2 min-w-0">
                      <span className="text-muted-foreground mt-0.5 cursor-grab text-xs font-semibold select-none">
                        ⋮⋮
                      </span>
                      <span
                        className={
                          "flex-1 min-w-0 text-xs " +
                          (isActive ? "text-primary font-medium" : "")
                        }
                      >
                        <span className="block truncate" title={lesson.title || "Untitled"}>
                          {idx + 1}. {lesson.title || "Untitled"}
                        </span>
                        {lesson.description && (
                          <div
                            className="text-muted-foreground mt-0.5 text-[11px] leading-tight line-clamp-1"
                            title={lesson.description}
                          >
                            {truncateWords(lesson.description, 5)}
                          </div>
                        )}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeLesson(lesson.id);
                        }}
                        className="hover:bg-red-500/20 text-red-500 hover:text-red-600 rounded p-1 transition-colors opacity-80 hover:opacity-100"
                        title="Delete lesson"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {/* Completion toggle only for learners */}
                    {isLearner && (
                      <button
                        className="ml-2"
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
                      >
                        {isCompleted ? (
                          <CheckCircle size={18} className="text-green-500" />
                        ) : (
                          <Circle size={18} className="text-gray-400" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {!chaptersSorted.length && !lessonsSorted.length && (
            <div className="text-muted-foreground text-xs">No lessons yet.</div>
          )}

          <button
            onClick={() => handleCreateChapter()}
            disabled={createChapter.status === "pending"}
            className="text-foreground hover:bg-accent group flex w-full items-start gap-2 rounded-md border border-dashed px-3 py-2 text-sm font-medium"
          >
            <Folder
              size={16}
              className="text-muted-foreground group-hover:text-foreground"
            />
            {createChapter.status === "pending" ? "Creating..." : "Add Chapter"}
          </button>

          <button
            onClick={() => handleCreateLesson()}
            disabled={addLesson.status === "pending"}
            className="text-foreground hover:bg-accent group flex w-full items-start gap-2 rounded-md border border-dashed px-3 py-2 text-sm font-medium"
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
                  : `Publish Course (${typeof unpublishedCount === "number" && unpublishedCount > 1 ? `${unpublishedCount} drafts` : `${unpublishedCount} draft`})`}
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
              <textarea
                value={lessonMeta.description}
                onChange={(e) =>
                  setLessonMeta((m) => ({
                    ...m,
                    description: e.target.value,
                    dirty: true,
                  }))
                }
                placeholder="Lesson description"
                className="mt-2 w-full resize-none bg-transparent text-base font-normal tracking-tight outline-none"
                rows={2}
                maxLength={200}
              />
              <div
                className="text-muted-foreground text-[10px] tracking-wide uppercase"
                style={{ marginTop: -25 }}
              >
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
                    key={activeLesson?.id ?? "no-lesson"}
                    json={editorJson ?? { type: "doc", content: [] }}
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
