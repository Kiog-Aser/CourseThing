import * as React from "react";
import { cn, Spinner } from "../ui";

/**
 * ProviderButton
 *
 * Problem this solves:
 * Using a normal flex row with `gap-*` for an OAuth provider button.
 * This component:
 *  - Uses flexbox to align the icon and text.
 *  - Keeps a consistent hit area & focus ring.
 *  - Provides a loading state without layout shift.
 *
 * Usage:
 * <ProviderButton icon={<GoogleIcon />} onClick={...}>Continue with Google</ProviderButton>
 */
export interface ProviderButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /**
   * Icon element (16–20px recommended). It will be placed in a fixed left slot.
   */
  icon: React.ReactNode;
  /**
   * Visible label (children must be plain text or inline elements).
   */
  children: React.ReactNode;
  /**
   * When true, shows a spinner and disables interaction.
   */
  loading?: boolean;
  /**
   * Visual variant.
   */
  variant?: "outline" | "ghost" | "default";
  /**
   * Size variant.
   */
  size?: "sm" | "md" | "lg";
  /**
   * Text shown while loading (defaults to "Please wait")
   */
  loadingText?: string;
}

const sizeStyles: Record<NonNullable<ProviderButtonProps["size"]>, string> = {
  sm: "h-8 text-xs rounded-md",
  md: "h-10 text-sm rounded-md",
  lg: "h-11 text-sm rounded-md",
};

const variantStyles: Record<
  NonNullable<ProviderButtonProps["variant"]>,
  string
> = {
  outline:
    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  ghost:
    "bg-transparent hover:bg-accent hover:text-accent-foreground border border-transparent",
  default:
    "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/70",
};

export const ProviderButton = React.forwardRef<
  HTMLButtonElement,
  ProviderButtonProps
>(
  (
    {
      icon,
      children,
      className,
      loading,
      disabled,
      variant = "outline",
      size = "md",
      type = "button",
      loadingText = "Please wait",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          "ring-offset-background relative font-medium transition-colors outline-none select-none",
          "focus-visible:ring-ring/60 focus-visible:ring-2 focus-visible:ring-offset-2",
          // base layout
          "inline-flex items-center justify-center gap-3",
          sizeStyles[size],
          variantStyles[variant],
          // disabled
          "disabled:cursor-not-allowed disabled:opacity-55",
          className,
        )}
        {...props}
      >
        {/* Icon */}
        <span className={cn(loading && "opacity-0")} aria-hidden="true">
          {icon}
        </span>

        {/* Label */}
        <span className={cn("whitespace-nowrap", loading && "opacity-0")}>
          {children}
        </span>

        {/* Loading Overlay */}
        {loading && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Spinner className="mr-2 h-4 w-4" />
            <span className="text-foreground/80 text-sm">{loadingText}</span>
          </span>
        )}
      </button>
    );
  },
);

ProviderButton.displayName = "ProviderButton";
