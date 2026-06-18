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

function RegisterForm() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, password }),
    });

    setLoading(false);

    if (res.ok) {
      toast.success("Account created successfully! Please sign in.");
      router.push("/auth/signin");
    } else {
      const data = (await res.json()) as { error?: string };
      toast.error(data.error ?? "Registration failed");
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
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      autoFocus
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
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
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
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
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
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
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
