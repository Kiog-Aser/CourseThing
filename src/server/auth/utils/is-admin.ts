/**
 * is-admin.ts
 *
 * Central helper to determine if an email belongs to an admin based purely on
 * the comma‑separated allow‑list in the `ADMIN_EMAILS` environment variable.
 *
 * This removes any dependency on a persisted database role flag; access control
 * becomes configuration-driven and predictable. Usage:
 *
 *   import { isAdminEmail } from "~/server/auth/utils/is-admin";
 *   const admin = isAdminEmail(session?.user?.email);
 *
 * Implementation details:
 * - ADMIN_EMAILS may contain whitespace; we trim each entry.
 * - Case-insensitive comparison (emails normalized to lower case).
 * - Empty or missing ADMIN_EMAILS => no admins.
 *
 * If you later decide to reintroduce DB roles, keep this function as a fast,
 * config-based override or merge the logic.
 */

import { env } from "~/env";

/**
 * Preprocess the allow-list once per process. We intentionally do this at module
 * load to avoid re-splitting on every call, while still supporting hot reload
 * in Next.js dev (the module will be re-evaluated on change).
 */
const adminEmailSet: ReadonlySet<string> = (() => {
  const raw = env.ADMIN_EMAILS ?? "";
  if (!raw.trim()) return new Set<string>();
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
})();

/**
 * Returns true if the given email is in the configured admin allow-list.
 *
 * @param email - The user email to check (can be null/undefined).
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmailSet.has(email.toLowerCase());
}

/**
 * Expose the raw allow list (read-only) for logging or diagnostics.
 * Avoid mutating this at runtime; any changes should happen through env vars.
 */
export function getAdminEmails(): string[] {
  return Array.from(adminEmailSet.values());
}
