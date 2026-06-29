"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Mail, Shield } from "lucide-react";
import {
  AuthCard,
  AuthCardHeader,
  AuthPageShell,
} from "~/components/auth/auth-page-shell";
import { LegalAgreementNotice } from "~/components/legal/legal-links";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { env } from "~/env";
import { authClient } from "~/lib/auth-client";
import { toast } from "sonner";

interface SignInFormProps {
  allowRegistration: boolean;
}

export function SignInForm({ allowRegistration }: SignInFormProps) {
  const authentikEnabled = env.NEXT_PUBLIC_AUTHENTIK_ENABLED === true;
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await authClient.signIn.email({ email, password });

    setLoading(false);

    if (error) {
      const message = error.message?.toLowerCase() ?? "";
      const rateLimited =
        error.status === 429 ||
        message.includes("too many") ||
        message.includes("rate limit");
      toast.error(
        rateLimited
          ? "Too many sign-in attempts. Please wait a moment and try again."
          : error.message && error.message !== "Required"
            ? error.message
            : "Invalid email or password",
      );
      return;
    }

    toast.success("Signed in successfully!");
    router.push(callbackUrl);
    router.refresh();
  }

  async function handleSocialSignIn() {
    setLoading(true);
    try {
      await authClient.signIn.oauth2({
        providerId: "authentik",
        callbackURL: callbackUrl,
      });
    } catch (error) {
      console.error("[SSO Error]", error);
      setLoading(false);
    }
  }

  return (
    <AuthPageShell>
      <AuthCard>
        <AuthCardHeader
          title="Welcome back"
          description="Sign in to your workspace"
        />

        {!allowRegistration && (
          <p className="bg-muted/50 text-muted-foreground mb-5 rounded-xl border px-3 py-2.5 text-sm">
            New account registration is currently disabled.
          </p>
        )}

        {authentikEnabled && (
          <div className="mb-5 space-y-4">
            <Button
              variant="outline"
              type="button"
              className="h-11 w-full"
              onClick={handleSocialSignIn}
              disabled={loading}
            >
              <Shield className="mr-2 h-4 w-4" />
              Sign in with Authentik
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="border-border/50 w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background/80 text-muted-foreground px-2">
                  or
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                className="h-11 pl-10"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/auth/forgot-password"
                className="text-muted-foreground text-xs hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11 pl-10"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        {allowRegistration && (
          <p className="text-muted-foreground mt-6 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="text-foreground font-medium hover:underline"
            >
              Create account
            </Link>
          </p>
        )}

        <LegalAgreementNotice action="signing in" className="mt-5" />
      </AuthCard>
    </AuthPageShell>
  );
}
