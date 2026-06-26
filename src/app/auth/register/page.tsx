"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";
import { Logo } from "~/components/branding/logo";
import { LegalAgreementNotice } from "~/components/legal/legal-links";
import { Mail, Lock, ArrowRight, User } from "lucide-react";

function formatAuthError(message: string | undefined, fallback: string): string {
  if (!message || message === "Required") {
    return fallback;
  }
  return message;
}

function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const trimmedFirstName = String(formData.get("firstName") ?? "").trim();
    const trimmedLastName = String(formData.get("lastName") ?? "").trim();
    const trimmedEmail = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail) {
      toast.error("Please enter your first name, last name, and email.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          email: trimmedEmail,
          password,
        }),
      });

      let data: { error?: string; signInRequired?: boolean } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        toast.error("Registration failed. Please try again.");
        return;
      }

      if (!res.ok) {
        toast.error(
          formatAuthError(data.error, "Registration failed. Please check the form."),
        );
        return;
      }

      if (data.signInRequired) {
        toast.success("Account created! Please sign in.");
        router.push("/auth/signin");
        return;
      }

      toast.success("Account created successfully!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Registration failed. Please try again.");
    } finally {
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
                <h1 className="font-heading text-2xl font-bold">Create your account</h1>
                <p className="text-muted-foreground text-sm">Get started today</p>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      autoFocus
                      autoComplete="given-name"
                      className="h-10 pl-10"
                      placeholder="John"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      autoComplete="family-name"
                      className="h-10 pl-10"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="h-10 pl-10"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="h-10 pl-10"
                    placeholder="••••••••"
                  />
                </div>
                <p className="text-muted-foreground text-xs">At least 8 characters</p>
              </div>

              <Button type="submit" className="h-10 w-full" disabled={loading}>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="border-primary-foreground/30 border-t-primary-foreground h-4 w-4 animate-spin rounded-full border-2" />
                    <span>Creating account…</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Create Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            <p className="text-muted-foreground text-center text-sm">
              Already have an account?{" "}
              <a href="/auth/signin" className="text-foreground font-medium hover:underline">
                Sign in
              </a>
            </p>

            <LegalAgreementNotice action="creating an account" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
