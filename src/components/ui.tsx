import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to compose className strings with conditional logic + tailwind-merge
 */
export function cn(...inputs: Array<string | undefined | null | false>) {
  return twMerge(clsx(inputs));
}

/* -------------------------------------------------------------------------------------------------
 * Button
 * Inspired by shadcn/ui button but tailored to current design tokens + Tailwind v4 syntax
 * -----------------------------------------------------------------------------------------------*/

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-3 select-none [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border bg-background hover:bg-accent hover:text-accent-foreground",
        ghost:
          "hover:bg-accent hover:text-accent-foreground text-foreground/80",
        link: "text-primary underline-offset-4 hover:underline",
        subtle:
          "bg-muted text-foreground/90 hover:bg-muted/80 shadow-sm border border-border/50",
        gradient:
          "relative overflow-hidden bg-gradient-to-r from-primary to-primary/70 text-primary-foreground shadow hover:brightness-105 focus-visible:ring-primary/60",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
        pill: "h-9 px-6 rounded-full",
      },
      tone: {
        // Optional tonal emphasis layering
        solid: "",
        soft: "bg-primary/10 text-primary hover:bg-primary/15",
        quiet: "bg-transparent hover:bg-muted",
      },
      isLoading: {
        true: "relative text-transparent hover:text-transparent pointer-events-none",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "link",
        size: "icon",
        className: "h-auto w-auto p-0",
      },
      {
        variant: "ghost",
        size: "icon",
        className: "h-9 w-9",
      },
      {
        variant: "outline",
        tone: "soft",
        className:
          "bg-primary/5 text-primary hover:bg-primary/10 border-primary/20",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      tone: "solid",
      isLoading: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loadingText?: string;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      tone,
      isLoading,
      loadingText = "Loading...",
      children,
      type = "button",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        data-variant={variant}
        data-size={size}
        className={cn(
          buttonVariants({ variant, size, tone, isLoading }),
          className,
        )}
        {...props}
      >
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner className="mr-2 h-4 w-4" />
            <span className="text-foreground/80">{loadingText}</span>
          </span>
        )}
        <span
          className={cn("inline-flex items-center", isLoading && "opacity-0")}
        >
          {children}
        </span>
      </button>
    );
  },
);
Button.displayName = "Button";

/* -------------------------------------------------------------------------------------------------
 * Spinner (lightweight)
 * -----------------------------------------------------------------------------------------------*/
export function Spinner({
  className,
  ...props
}: React.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("animate-spin text-current", className)}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4c-2.21 0-4 1.79-4 4H4z"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Input
 * -----------------------------------------------------------------------------------------------*/

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        aria-invalid={invalid || undefined}
        className={cn(
          "border-input bg-background flex h-9 w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors",
          "placeholder:text-muted-foreground/70",
          // focus styles
          "focus-visible:ring-ring/60 ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid &&
            "border-destructive text-destructive focus-visible:ring-destructive/40",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

/* -------------------------------------------------------------------------------------------------
 * Label
 * -----------------------------------------------------------------------------------------------*/

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  requiredMark?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, requiredMark, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className,
        )}
        {...props}
      >
        {children}
        {requiredMark && (
          <span className="text-destructive ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
    );
  },
);
Label.displayName = "Label";

/* -------------------------------------------------------------------------------------------------
 * Card
 * -----------------------------------------------------------------------------------------------*/

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, as: Comp = "div", ...props }, ref) => {
    return (
      <Comp
        ref={ref}
        className={cn(
          "border-border/60 bg-card text-card-foreground rounded-lg border shadow-sm",
          className,
        )}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  );
});
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  return (
    <h3
      ref={ref}
      className={cn(
        "text-foreground text-lg font-semibold tracking-tight",
        className,
      )}
      {...props}
    />
  );
});
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
});
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />;
});
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex items-center gap-2 p-6 pt-0", className)}
      {...props}
    />
  );
});
CardFooter.displayName = "CardFooter";

/* -------------------------------------------------------------------------------------------------
 * FormField helper layout (optional)
 * -----------------------------------------------------------------------------------------------*/

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  error?: string;
  hint?: string;
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, error, hint, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-1.5", className)} {...props}>
        {children}
        {error ? (
          <p className="text-destructive text-xs font-medium">{error}</p>
        ) : hint ? (
          <p className="text-muted-foreground text-xs">{hint}</p>
        ) : null}
      </div>
    );
  },
);
FormField.displayName = "FormField";

/* -------------------------------------------------------------------------------------------------
 * Text helper (muted)
 * -----------------------------------------------------------------------------------------------*/
export const Muted = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn("text-muted-foreground text-sm leading-relaxed", className)}
    {...props}
  />
);

/* -------------------------------------------------------------------------------------------------
 * Alert
 * -----------------------------------------------------------------------------------------------*/
export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "error" | "warning";
}

const alertStyles: Record<NonNullable<AlertProps["variant"]>, string> = {
  info: "bg-blue-50 border-blue-200 text-blue-800",
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-destructive/10 border-destructive/30 text-destructive",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        alertStyles[variant],
        className,
      )}
      {...props}
    />
  ),
);
Alert.displayName = "Alert";
