"use client";

import React from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { FileUpload } from "~/components/ui";

/**
 * Props passed from the server page (DashboardPage).
 * These are the server‑fetched courses so the list paints instantly
 * before the client tRPC query resolves.
 */
export interface AdminDashboardClientProps {
  initialCourses: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    language: string;
  }>;
}

/**
 * Dedicated client component for the Admin Dashboard.
 * Separated from the server page file to avoid RSC / Turbopack
 * confusion that caused api.useUtils / api.useContext to be undefined.
 */
export function AdminDashboardClient(props: AdminDashboardClientProps) {
  const { initialCourses } = props;

  // tRPC v11: useUtils (alias of useContext) – works in a pure client module
  const utils = api.useUtils();

  const coursesQuery = api.course.list.useQuery(undefined, {
    // Provide initial data so we paint without loading state flicker
    initialData: initialCourses,
  });

  const createCourse = api.course.create.useMutation({
    onSuccess: () => {
      void utils.course.list.invalidate();
      setForm({ title: "", slug: "", description: "", language: "", poster: "" });
    },
  });

  const deleteCourse = api.course.deleteCourse.useMutation({
    onSuccess: () => {
      void utils.course.list.invalidate();
    },
  });

  const [form, setForm] = React.useState({
    title: "",
    slug: "",
    language: "",
    description: "",
    poster: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Submitting form with data:", form);
    if (!form.title || !form.slug || !form.language) {
      console.error("Form validation failed. Required fields are missing.");
      return;
    }
    createCourse.mutate(form);
  }

  function normalizeSlug(raw: string) {
    return raw
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/--+/g, "-");
  }

  return (
    <main className="mx-auto max-w-5xl space-y-10 p-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Create and manage courses
          </p>
        </div>
        <Link
          href="/"
          className="hover:text-foreground text-sm underline underline-offset-4"
        >
          Home
        </Link>
      </header>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4 rounded-lg border p-5">
          <h2 className="text-lg font-semibold">Create Course</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-muted-foreground block text-[11px] font-medium uppercase">
                Title
              </label>
              <input
                placeholder="e.g. Intro to TypeScript"
                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground block text-[11px] font-medium uppercase">
                Slug
              </label>
              <input
                placeholder="intro-to-typescript"
                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: normalizeSlug(e.target.value) })
                }
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground block text-[11px] font-medium uppercase">
                Language (ISO code or name)
              </label>
              <input
                placeholder="e.g. spanish / es"
                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={form.language}
                onChange={(e) =>
                  setForm({ ...form, language: e.target.value.trim() })
                }
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground block text-[11px] font-medium uppercase">
                Description
              </label>
              <textarea
                placeholder="High level overview..."
                className="bg-background h-24 w-full resize-none rounded-md border px-3 py-2 text-sm leading-relaxed"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground block text-[11px] font-medium uppercase">
                Course Poster (optional)
              </label>
              <FileUpload
                currentImage={form.poster}
                onUpload={(url) => setForm({ ...form, poster: url })}
                placeholder="Upload course poster image"
                maxSizeText="5MB"
              />
            </div>

            <button
              disabled={createCourse.status === "pending"}
              className="bg-primary text-primary-foreground inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow transition-colors disabled:opacity-50"
              type="submit"
            >
              {createCourse.status === "pending"
                ? "Creating..."
                : "Create Course"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Existing Courses</h2>
          {coursesQuery.isLoading && (
            <p className="text-muted-foreground text-sm">Loading courses...</p>
          )}
          <ul className="space-y-3">
            {coursesQuery.data?.map((c) => (
              <li
                key={c.id}
                className="group hover:bg-muted/40 rounded-lg border p-4 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    {c.poster && (
                      <img
                        src={c.poster}
                        alt={c.title}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{c.title}</div>
                      <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <span>/{c.slug}</span>
                        <span className="bg-muted rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                          {c.language}
                        </span>
                      </div>
                      {c.description && (
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                          {c.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 transition group-hover:opacity-100">
                    <Link
                      href={`/dashboard/course/${c.slug}`}
                      className="hover:bg-background rounded-md border px-2 py-1 text-xs"
                    >
                      Manage
                    </Link>
                    <button
                      onClick={() => {
                        if (deleteCourse.status === "pending") return;
                        if (
                          confirm(
                            "Delete this course? This will remove all its lessons.",
                          )
                        ) {
                          deleteCourse.mutate({ id: c.id });
                        }
                      }}
                      disabled={
                        deleteCourse.status === "pending" &&
                        (deleteCourse.variables as any)?.id === c.id
                      }
                      className="hover:bg-destructive/10 text-destructive border-destructive/60 rounded-md border px-2 py-1 text-xs disabled:opacity-50"
                    >
                      {deleteCourse.status === "pending" &&
                      (deleteCourse.variables as any)?.id === c.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {coursesQuery.data?.length === 0 && (
              <li className="text-muted-foreground text-sm">No courses yet.</li>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}

export default AdminDashboardClient;
