import React from "react";
import { cn } from "../ui";

/**
 * AuthShell
 *
 * A lightweight layout wrapper for authentication pages (sign in / sign up).
 * Provides:
 * - Centered constrained panel
 * - Subtle decorative background (radial fade + grid) that adapts to dark mode
 * - Optional title / description / footer
 * - Slot for a brand element (icon / logo) rendered above the panel
 *
 * Keep this intentionally minimal so individual auth pages stay lean.
 */
export interface AuthShellProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  brand?: React.ReactNode;
  className?: string;
  panelClassName?: string;
  /**
   * Constrains the max width of the panel.
   * sm (320px), md (400px), lg (480px)
   */
  size?: "sm" | "md" | "lg";
  /**
   * If true, removes panel border + background (useful when page supplies its own card).
   */
  bare?: boolean;
}

const SIZE_MAP: Record<NonNullable<AuthShellProps["size"]>, string> = {
  sm: "max-w-xs",
  md: "max-w-sm",
  lg: "max-w-md",
};

/**
 * Internal decorative background layer.
 * Uses two absolutely positioned divs:
 * 1. A radial gradient glow
 * 2. A subtle grid mask
 */
function BackgroundDecoration() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Radial gradient glow */}
      <div className="from-primary/15 to-transparent dark:from-primary/20 pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-radial [--tw-gradient-from-position:25%] blur-3xl" />
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.35] [mask-image:linear-gradient(to_bottom,black,transparent)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.border)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.border)_1px,transparent_1px)] bg-[size:48px_48px] dark:opacity-60" />
      </div>
    </div>
  );
}

export function AuthShell({
  children,
  title,
  description,
  footer,
  brand,
  size = "md",
  className,
  panelClassName,
  bare = false,
}: AuthShellProps) {
  return (
    <div
      className={cn(
        "bg-background relative flex min-h-screen flex-col items-center justify-center px-4 py-10",
        className,
      )}
    >
      <BackgroundDecoration />

      <div
        className={cn(
          "relative mx-auto w-full",
          SIZE_MAP[size],
          !bare &&
            "border-border/60 bg-card/95 supports-[backdrop-filter]:bg-card/80 rounded-xl border shadow-sm backdrop-blur-md",
          panelClassName,
        )}
      >
        <div className="relative flex flex-col p-6">
          {(brand || title || description) && (
            <div className="mb-6 flex flex-col items-center text-center">
              {brand && (
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border/60 bg-background/70 shadow-sm">
                  {brand}
                </div>
              )}
              {title && (
                <h1 className="text-foreground mb-1 text-xl font-semibold tracking-tight">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          )}

            {/* Content */}
          <div className="flex flex-col gap-6">{children}</div>

          {footer && (
            <div className="mt-8 border-t border-dashed pt-6 text-center text-xs text-muted-foreground">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Convenience subcomponents (optional)
 * Usage:
 * <AuthShell.Footer>...</AuthShell.Footer>
 */
function Footer(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("text-center text-xs", props.className)} />;
}
AuthShell.Footer = Footer;
