"use client";

import { useState, useEffect } from "react";
import { signIn, getProviders } from "next-auth/react";
import { UserPlus, Mail, Github, LogIn } from "lucide-react";
import { Alert, Button, Input, Label, FormField } from "~/components/ui";
import { AuthShell } from "~/components/auth/auth-shell";
import { ProviderButton } from "~/components/auth/provider-button";

interface Provider {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
}

export default function SignUpPage() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(
    null,
  );
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const loadProviders = async () => {
      const p = await getProviders();
      setProviders(p);
    };
    void loadProviders();
  }, []);

  const providerIcon = (providerId: string) => {
    switch (providerId) {
      case "google":
        return (
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        );
      case "github":
        return <Github className="h-4 w-4" />;
      default:
        return <LogIn className="h-4 w-4" />;
    }
  };

  const handleProvider = async (providerId: string) => {
    setLoadingProvider(providerId);
    try {
      await signIn(providerId, { callbackUrl: "/dashboard" });
    } catch {
      setMessage({ type: "error", text: "Sign up failed. Try again." });
      setLoadingProvider(null);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await signIn("resend", {
        email,
        redirect: false,
        callbackUrl: "/dashboard",
      });
      if (res?.error) {
        setMessage({
          type: "error",
          text: "Could not send magic link. Please retry.",
        });
      } else {
        setMessage({
          type: "success",
          text: "Magic link sent! Check your inbox.",
        });
        setEmail("");
      }
    } catch {
      setMessage({ type: "error", text: "Unexpected error. Please retry." });
    }
    setIsLoading(false);
  };

  return (
    <AuthShell
      title="Create your account"
      description="Start learning with Moo"
      brand={<UserPlus className="h-6 w-6" />}
      footer={
        <div className="space-y-3">
          <p className="leading-relaxed">
            We use passwordless sign in. By continuing you agree to our{" "}
            <a
              href="#"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Terms
            </a>{" "}
            &amp;{" "}
            <a
              href="#"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Privacy
            </a>
            .
          </p>
          <p>
            Already have an account?{" "}
            <a
              href="/signin"
              className="text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </a>
          </p>
        </div>
      }
    >
      {message && (
        <Alert
          variant={message.type === "success" ? "success" : "error"}
          className="animate-in fade-in-0 slide-in-from-top-1"
        >
          {message.text}
        </Alert>
      )}

      {providers &&
        Object.values(providers).filter((p: Provider) => p.id !== "resend")
          .length > 0 && (
          <div className="space-y-2">
            {Object.values(providers)
              .filter((p: Provider) => p.id !== "resend")
              .map((p: Provider) => (
                <ProviderButton
                  key={p.id}
                  variant="outline"
                  size="lg"
                  icon={
                    loadingProvider === p.id ? (
                      <Mail className="h-4 w-4 animate-spin" />
                    ) : (
                      providerIcon(p.id)
                    )
                  }
                  onClick={() => handleProvider(p.id)}
                  loading={loadingProvider === p.id}
                  loadingText="Redirecting..."
                  className="w-full font-medium"
                >
                  {`Continue with ${p.name}`}
                </ProviderButton>
              ))}
          </div>
        )}

      {providers && Object.values(providers).some((p) => p.id !== "resend") && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="border-border/60 w-full border-t" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background text-muted-foreground px-2 text-[11px] font-medium tracking-wide uppercase">
              Or use email
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleEmail} className="space-y-4">
        <FormField>
          <Label htmlFor="email" requiredMark>
            Email
          </Label>
          <div className="relative">
            <Mail className="text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="pl-9"
            />
          </div>
        </FormField>
        <Button
          type="submit"
          className="w-full gap-4"
          size="lg"
          variant="gradient"
          isLoading={isLoading}
          loadingText="Sending link..."
          disabled={!email || isLoading}
        >
          <Mail className="h-4 w-4" />
          Email me a magic link
        </Button>
      </form>
    </AuthShell>
  );
}
