"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { Lock, AlertTriangle } from "lucide-react";
import { Button } from "~/components/ui";
import Link from "next/link";

interface CreativeFunSubscriptionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that guards premium content behind CreatiFun subscription
 * Shows subscription required message if user doesn't have active subscription
 */
export function CreativeFunSubscriptionGuard({
  children,
  fallback,
}: CreativeFunSubscriptionGuardProps) {
  const { data: session, status } = useSession();

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If user is not authenticated, show auth required message
  if (!session?.user) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-5 text-center">
        <Lock className="text-muted-foreground h-10 w-10" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Sign in to continue
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You need to be signed in to access CreatiFun premium content.
            Create a free account or sign in to get started.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/signup">Create free account</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/signin">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Check if user has CreatiFun subscription
  const hasCreativeFunSubscription = session.user.creativeFunSubscription;

  // If user doesn't have subscription, show subscription required message
  if (!hasCreativeFunSubscription) {
    return fallback || (
      <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-5 text-center">
        <AlertTriangle className="text-amber-500 h-10 w-10" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            CreatiFun Subscription Required
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This premium content is exclusively available to CreatiFun subscribers.
            Subscribe to unlock access to all premium courses and exclusive content.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/signup?subscription=creativefun">
              Subscribe to CreatiFun
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Browse Free Content</Link>
          </Button>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          <p>
            Already a subscriber?{" "}
            <Link
              href="/support"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Contact support
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // User has subscription, render children
  return <>{children}</>;
}

export default CreativeFunSubscriptionGuard;
