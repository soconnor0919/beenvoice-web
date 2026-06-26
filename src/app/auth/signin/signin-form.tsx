"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "~/lib/auth-client";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";
import { Logo } from "~/components/branding/logo";
import { LegalAgreementNotice } from "~/components/legal/legal-links";
import { env } from "~/env";
import { Mail, Lock, ArrowRight, Shield } from "lucide-react";

interface SignInFormProps {
  allowRegistration: boolean;
}

export function SignInForm({ allowRegistration }: SignInFormProps) {
  const authentikEnabled = env.NEXT_PUBLIC_AUTHENTIK_ENABLED === true;
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const signupDisabled = searchParams.get("signup") === "disabled";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await authClient.signIn.email({ email, password });

    setLoading(false);

    if (error) {
      toast.error(
        error.message && error.message !== "Required"
          ? error.message
          : "Invalid email or password",
      );
    } else {
      toast.success("Signed in successfully!");
      router.push(callbackUrl);
      router.refresh();
    }
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="animate-blob h-[800px] w-[800px] rounded-full bg-neutral-400/30 blur-3xl dark:bg-neutral-500/20"></div>
      </div>

      <Card className="mx-auto w-full max-w-md border-border/50 bg-background/80 backdrop-blur-xl">
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Logo size="lg" />
              <div>
                <h1 className="font-heading text-2xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground text-sm">Sign in to your account</p>
              </div>
            </div>

            {signupDisabled && (
              <div className="border-border bg-muted/50 text-muted-foreground rounded-lg border px-3 py-2 text-sm">
                New account registration is currently disabled.
              </div>
            )}

            {authentikEnabled && (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  type="button"
                  className="h-10 w-full"
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
                    <span className="bg-background text-muted-foreground px-2">or</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="h-10 pl-10"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="/auth/forgot-password" className="text-muted-foreground text-xs hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10 pl-10"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button type="submit" className="h-10 w-full" disabled={loading}>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="border-primary-foreground/30 border-t-primary-foreground h-4 w-4 animate-spin rounded-full border-2" />
                    <span>Signing in…</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            {allowRegistration && (
              <p className="text-muted-foreground text-center text-sm">
                Don&apos;t have an account?{" "}
                <a href="/auth/register" className="text-foreground font-medium hover:underline">
                  Sign up
                </a>
              </p>
            )}

            <LegalAgreementNotice action="signing in" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPageClient() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm allowRegistration />
    </Suspense>
  );
}
