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
    });
  }

  function handleInputChange(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
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
              {new Date(initialCourse.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Last Updated:</span>
            <div className="font-medium">
              {new Date(initialCourse.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default CourseSettingsClient;
