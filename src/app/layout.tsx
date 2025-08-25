import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import Link from "next/link";
import { auth, signIn, signOut } from "~/server/auth";
import { isAdminEmail } from "~/server/auth/utils/is-admin";
import React from "react";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "CreatiFun - Creative Learning Platform",
  description:
    "Unlock your creativity through engaging, interactive courses. Experience free first lessons and track your progress as you build new skills step by step.",
  keywords: [
    "creative learning",
    "courses",
    "education",
    "online learning",
    "skill development",
    "creativity",
  ],
  authors: [{ name: "CreatiFun" }],
  creator: "CreatiFun",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "icon", url: "/icon.svg", type: "image/svg+xml" },
    { rel: "apple-touch-icon", url: "/icon.svg" },
  ],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = isAdminEmail(session?.user?.email);
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SessionProvider session={session}>
          <TRPCReactProvider>
            <header className="flex items-center justify-between border-b px-4 py-2 text-sm">
              <Link href="/" className="font-semibold">
                CreatiFun
              </Link>
              <nav className="flex items-center gap-3">
                <Link href="/learn">Learn</Link>
                {isAdmin && <Link href="/dashboard">Dashboard</Link>}
                {session?.user ? (
                  <form
                    action={async () => {
                      "use server";
                      await signOut();
                    }}
                  >
                    <button className="rounded bg-black px-2 py-1 text-white dark:bg-white dark:text-black">
                      Sign out
                    </button>
                  </form>
                ) : (
                  <Link
                    href="/signin"
                    className="rounded bg-black px-2 py-1 text-white dark:bg-white dark:text-black"
                  >
                    Sign in
                  </Link>
                )}
              </nav>
            </header>
            {children}
          </TRPCReactProvider>
        </SessionProvider>
        <script
          src="https://app.rybbit.io/api/script.js"
          data-site-id="2206"
          defer
        ></script>
      </body>
    </html>
  );
}
