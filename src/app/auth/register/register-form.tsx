"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, User } from "lucide-react";
import {
  AuthCard,
  AuthCardHeader,
  AuthPageShell,
} from "~/components/auth/auth-page-shell";
import { LegalAgreementNotice } from "~/components/legal/legal-links";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";

function formatAuthError(message: string | undefined, fallback: string): string {
  if (!message || message === "Required") {
    return fallback;
  }
  return message;
}

export function RegisterForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();

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
    <AuthPageShell>
      <AuthCard>
        <AuthCardHeader
          title="Create your account"
          description="Get started with your workspace"
        />

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <div className="relative">
                <User className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoFocus
                  autoComplete="given-name"
                  className="h-11 pl-10"
                  placeholder="John"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <div className="relative">
                <User className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                  className="h-11 pl-10"
                  placeholder="Doe"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 pl-10"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="h-11 pl-10"
                placeholder="••••••••"
              />
            </div>
            <p className="text-muted-foreground text-xs">At least 8 characters</p>
          </div>

          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <p className="text-muted-foreground mt-6 text-center text-sm">
          Already have an account?{" "}
          <Link
            href="/auth/signin"
            className="text-foreground font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>

        <LegalAgreementNotice action="creating an account" className="mt-5" />
      </AuthCard>
    </AuthPageShell>
  );
}
