"use client";

import React from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { FileUpload } from "~/components/ui";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

type CourseData = {
  id: string;
  slug: string;
  title: string;
  language: string;
  description: string | null;
  poster: string | null;
  audience: "FREE" | null;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
};

export interface CourseSettingsClientProps {
  initialCourse: CourseData;
}

export function CourseSettingsClient({ initialCourse }: CourseSettingsClientProps) {
  const utils = api.useUtils();

  const [form, setForm] = React.useState({
    title: initialCourse.title,
    slug: initialCourse.slug,
    language: initialCourse.language,
    description: initialCourse.description ?? "",
    poster: initialCourse.poster ?? "",
    audience: initialCourse.audience ?? null,
  });

  const [hasChanges, setHasChanges] = React.useState(false);

  const updateCourse = api.course.update.useMutation({
    onSuccess: () => {
      void utils.course.list.invalidate();
      void utils.course.bySlug.invalidate({ slug: initialCourse.slug });
      setHasChanges(false);
    },
  });

  function normalizeSlug(raw: string) {
    return raw
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/--+/g, "-");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.slug || !form.language) {
      return;
    }

    updateCourse.mutate({
      id: initialCourse.id,
      title: form.title,
      slug: form.slug,
      language: form.language,
      description: form.description,
      poster: form.poster,
      audience: form.audience,
    });
  }

  function handleInputChange(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }

  function handleFreeToggle(checked: boolean) {
    setForm(prev => ({ ...prev, audience: checked ? "FREE" : null }));
    setHasChanges(true);
  }





  const isLoading = updateCourse.status === "pending";

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/course/${initialCourse.slug}`}
          className="hover:bg-accent rounded-md p-2 transition"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Course Settings</h1>
          <p className="text-muted-foreground text-sm">
            Update basic information for "{initialCourse.title}"
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Title */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium">
              Course Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="e.g. Introduction to Spanish"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          {/* Slug */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium">
              Course URL Slug <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">/learn?course=</span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => handleInputChange("slug", normalizeSlug(e.target.value))}
                placeholder="introduction-to-spanish"
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will be the URL users visit to access your course
            </p>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Language <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.language}
              onChange={(e) => handleInputChange("language", e.target.value.trim())}
              placeholder="e.g. spanish / es"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
            <p className="text-xs text-muted-foreground">
              Language name or ISO code
            </p>
          </div>

          {/* Poster Image */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Course Poster</label>
            <FileUpload
              currentImage={form.poster}
              onUpload={(url) => handleInputChange("poster", url)}
              placeholder="Upload course poster image"
              maxSizeText="5MB"
            />
            <p className="text-xs text-muted-foreground">
              Optional poster image for the course
            </p>
          </div>

          {/* Description */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Brief description of the course..."
              rows={4}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground">
              A brief overview that will appear on the course cards and homepage
            </p>
          </div>

          {/* Free Course Toggle */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-medium">Free Course</label>
                <p className="text-xs text-muted-foreground">
                  When enabled, all lessons in this course are accessible to everyone without login or payment
                </p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-success toggle-lg"
                checked={form.audience === "FREE"}
                onChange={(e) => handleFreeToggle(e.target.checked)}
                aria-label="Toggle free course"
              />
            </div>
            {form.audience === "FREE" && (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md p-3">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">This course is completely free</span>
                </div>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  All lessons are accessible to everyone without login or payment requirements
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {!hasChanges && "No changes to save"}
          </div>
          <button
            type="submit"
            disabled={!hasChanges || isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Course Info */}
      <div className="bg-muted/30 rounded-lg border p-4">
        <h3 className="text-sm font-medium mb-2">Course Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Created:</span>
            <div className="font-medium">
              {new Date(initialCourse.createdAt).toLocaleDateString('en-US')}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Last Updated:</span>
            <div className="font-medium">
              {new Date(initialCourse.updatedAt).toLocaleDateString('en-US')}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default CourseSettingsClient;
