import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { Resend } from "resend";
import type { EmailConfig } from "next-auth/providers/email";
import { env } from "~/env";
import { checkCreativeFunSubscription } from "./utils/creative-fun-subscription";

import { db } from "~/server/db";
// (UserRole import removed - using allow-list, no enum needed)

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
      creativeFunSubscription?: boolean;
      // ...other properties
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Custom Resend Email Provider
 */
function ResendProvider(options: {
  from: string;
  maxAge?: number;
}): EmailConfig {
  return {
    id: "resend",
    type: "email",
    name: "Resend Email",
    from: options.from,
    maxAge: options.maxAge ?? 24 * 60 * 60, // 24 hours
    sendVerificationRequest: async ({ identifier, url, provider }) => {
      try {
        // Development mode: Just log the magic link instead of sending email
        if (
          env.NODE_ENV === "development" &&
          env.RESEND_API_KEY === "re_placeholder_resend_key"
        ) {
          console.log("\n🔗 DEVELOPMENT MODE - Magic Link:");
          console.log("====================================");
          console.log(`📧 To: ${identifier}`);
          console.log(`🔗 Link: ${url}`);
          console.log("====================================\n");
          console.log(
            "💡 Click the link above to sign in, or copy it to your browser",
          );
          return;
        }

        if (
          !env.RESEND_API_KEY ||
          env.RESEND_API_KEY === "re_placeholder_resend_key"
        ) {
          throw new Error(
            "RESEND_API_KEY is not configured for production use",
          );
        }

        const resend = new Resend(env.RESEND_API_KEY);

        await resend.emails.send({
          from: provider.from!,
          to: identifier,
          subject: "Sign in to CourseThing",
          text: `Sign in to CourseThing: ${url}`,
          html: `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
              <h2 style="color: #333;">Sign in to CourseThing</h2>
              <p>Click the button below to sign in to your CourseThing account:</p>
              <a href="${url}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                Sign In
              </a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${url}</p>
              <p style="color: #999; font-size: 12px; margin-top: 40px;">
                This link will expire in ${Math.floor((options.maxAge ?? 24 * 60 * 60) / 60)} minutes.
              </p>
              <p style="color: #999; font-size: 12px; margin-top: 20px;">
                Welcome to CourseThing!
              </p>
            </div>
          `,
        });
      } catch (error) {
        console.error("Failed to send verification email:", error);
        throw new Error("Failed to send verification email");
      }
    },
  };
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
    ResendProvider({
      from: env.EMAIL_FROM,
      maxAge: 60 * 30, // 30 minutes
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  adapter: PrismaAdapter(db),
  callbacks: {
    session: async ({ session, user }) => {
      try {
        // ADMIN ALLOW-LIST LOGIC:
        // Use comma-separated ADMIN_EMAILS env var to decide admin status.
        // Example: ADMIN_EMAILS="you@example.com,other@example.com"
        const adminEmails = (env.ADMIN_EMAILS ?? "")
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);

        const isAdmin =
          !!user.email && adminEmails.includes(user.email.toLowerCase());

        // Check CreatiFun subscription status
        const hasCreativeFunSubscription = user.email
          ? await checkCreativeFunSubscription(user.email)
          : false;

        return {
          ...session,
          user: {
            ...session.user,
            id: user.id,
            role: isAdmin ? "ADMIN" : "USER",
            creativeFunSubscription: hasCreativeFunSubscription,
          },
        };
      } catch (error) {
        console.error("Error in session callback (allow-list):", error);
        return {
          ...session,
          user: {
            ...session.user,
            id: user.id,
            role: "USER",
            creativeFunSubscription: false,
          },
        };
      }
    },
  },
  pages: {
    signIn: "/signin",
  },
} satisfies NextAuthConfig;
