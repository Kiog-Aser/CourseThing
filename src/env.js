import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().default("dev-secret-for-testing"),
    DATABASE_URL: z
      .string()
      .url()
      .default("postgresql://localhost:5432/moo_dev"),
    // Direct (non-pooled) URL for migrations / long-lived operations.
    // In Supabase, use the non-pooler host (no `.pooler.`) with sslmode=require.
    DIRECT_DATABASE_URL: z
      .string()
      .url()
      .default("postgresql://localhost:5432/moo_dev"),
    GOOGLE_CLIENT_ID: z.string().min(1).default("placeholder-google-client-id"),
    GOOGLE_CLIENT_SECRET: z
      .string()
      .min(1)
      .default("placeholder-google-secret"),
    RESEND_API_KEY: z.string().min(1).default("re_placeholder_resend_key"),
    EMAIL_FROM: z.string().email().default("test@example.com"),
    ADMIN_EMAILS: z.string().optional(), // comma separated list of admin emails
    SUPABASE_URL: z.string().url().default("https://placeholder.supabase.co"),
    SUPABASE_ANON_KEY: z.string().default("placeholder-anon-key"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
    NEXT_PUBLIC_SUPABASE_URL: z
      .string()
      .url()
      .default("https://placeholder.supabase.co"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default("placeholder-anon-key"),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET || "dev-secret-for-testing",
    DATABASE_URL:
      process.env.DATABASE_URL || "postgresql://localhost:5432/moo_dev",
    DIRECT_DATABASE_URL:
      process.env.DIRECT_DATABASE_URL || "postgresql://localhost:5432/moo_dev",
    GOOGLE_CLIENT_ID:
      process.env.GOOGLE_CLIENT_ID || "placeholder-google-client-id",
    GOOGLE_CLIENT_SECRET:
      process.env.GOOGLE_CLIENT_SECRET || "placeholder-google-secret",
    RESEND_API_KEY: process.env.RESEND_API_KEY || "re_placeholder_resend_key",
    EMAIL_FROM: process.env.EMAIL_FROM || "test@example.com",
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    SUPABASE_URL: process.env.SUPABASE_URL || "https://placeholder.supabase.co",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "placeholder-anon-key",
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
