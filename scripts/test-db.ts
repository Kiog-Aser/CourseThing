/**
 * Standalone Prisma connectivity / sanity test.
 *
 * Usage:
 *  1. Ensure your .env is present beside the project root and contains:
 *       DATABASE_URL=postgresql://... (pooled)
 *       DIRECT_DATABASE_URL=postgresql://... (direct / non-pooler, optional here)
 *  2. Run (with ts-node or tsx):
 *       npx tsx scripts/test-db.ts
 *     or compile first:
 *       npx tsc scripts/test-db.ts --outDir dist && node dist/scripts/test-db.js
 *
 * (If you need dotenv explicitly: `node -r dotenv/config node_modules/ts-node/dist/bin.js scripts/test-db.ts`)
 *
 * What it does:
 *  - Prints sanitized DATABASE_URL host + db name.
 *  - Executes a trivial `SELECT 1`.
 *  - Counts rows in NextAuth-related tables if they exist.
 *  - Reports success / failure clearly and exits with non-zero on failure.
 *
 * This isolates DB connectivity from Next.js / NextAuth so you can tell whether
 * the problem is:
 *   A) Basic network / credentials
 *   B) Prisma pooling / connection exhaustion
 *   C) Higher-level framework usage (middleware calling Prisma on Edge, etc.)
 */

import { PrismaClient } from "@prisma/client";

type CountResult = {
  table: string;
  count: number | string;
  ok: boolean;
  error?: string;
};

function sanitize(url: string | undefined): string {
  if (!url) return "(missing)";
  return url.replace(/:[^:@/]+@/, ":****@");
}

async function safeCount(
  prisma: PrismaClient,
  label: string,
  fn: () => Promise<number>,
): Promise<CountResult> {
  try {
    const count = await fn();
    return { table: label, count, ok: true };
  } catch (err) {
    return {
      table: label,
      count: "n/a",
      ok: false,
      error: (err as Error)?.message || String(err),
    };
  }
}

async function main() {
  const pooled = process.env.DATABASE_URL;
  const direct = process.env.DIRECT_DATABASE_URL;

  console.log("--------------------------------------------------");
  console.log(" Prisma Connectivity Test");
  console.log("--------------------------------------------------");
  console.log(" NODE_ENV               :", process.env.NODE_ENV);
  console.log(" DATABASE_URL (pooled)  :", sanitize(pooled));
  console.log(" DIRECT_DATABASE_URL    :", sanitize(direct));
  console.log("--------------------------------------------------");

  if (!pooled) {
    console.error("FATAL: DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

  let hadError = false;

  try {
    console.log("Running: SELECT 1;");
    const ping = await prisma.$queryRawUnsafe<any>("SELECT 1 as test");
    console.log("Ping result:", ping);

    console.log("\nCounting key tables (ignore NOT FOUND errors):");
    const results: CountResult[] = [];

    results.push(
      await safeCount(prisma, "User", () => prisma.user.count()),
      await safeCount(prisma, "Account", () => prisma.account.count()),
      await safeCount(prisma, "Session", () => prisma.session.count()),
      await safeCount(prisma, "VerificationToken", () =>
        prisma.verificationToken.count(),
      ),
      // App domain tables
      await safeCount(prisma, "Course", () => prisma.course.count()),
      await safeCount(prisma, "Lesson", () => prisma.lesson.count()),
      await safeCount(prisma, "Post", () => prisma.post.count()),
    );

    const colWidths = {
      table: Math.max(...results.map((r) => r.table.length), 14),
      count: 10,
      status: 8,
    };

    function pad(str: string, len: number) {
      if (str.length >= len) return str;
      return str + " ".repeat(len - str.length);
    }

    console.log(
      pad("Table", colWidths.table),
      pad("Count", colWidths.count),
      pad("Status", colWidths.status),
      "Error?",
    );
    console.log(
      "-".repeat(colWidths.table),
      "-".repeat(colWidths.count),
      "-".repeat(colWidths.status),
      "------",
    );

    for (const r of results) {
      if (!r.ok) hadError = true;
      console.log(
        pad(r.table, colWidths.table),
        pad(String(r.count), colWidths.count),
        pad(r.ok ? "OK" : "FAIL", colWidths.status),
        r.error ? r.error.split("\n")[0] : "",
      );
    }

    if (hadError) {
      console.log(
        "\nSome tables failed to count. If the schema was just created, run migrations:",
      );
      console.log("  npx prisma migrate deploy   (production)");
      console.log("or");
      console.log("  npx prisma migrate dev       (local dev)");
    }

    console.log("\nDone.");
  } catch (err) {
    hadError = true;
    console.error("UNHANDLED ERROR DURING TEST:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }

  if (hadError) {
    console.error("\nResult: FAIL (one or more operations failed).");
    process.exit(2);
  } else {
    console.log("\nResult: SUCCESS (connectivity healthy).");
  }
}

// Execute
main().catch((e) => {
  console.error("Fatal error in main():", e);
  process.exit(99);
});
