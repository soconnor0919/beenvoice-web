"use client";

import { useState, Suspense } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";
import { Logo } from "~/components/branding/logo";
import { LegalAgreementNotice } from "~/components/legal/legal-links";
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  Shield,
  Clock,
  CheckCircle,
} from "lucide-react";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as { error?: string };

      if (response.ok) {
        setSent(true);
        toast.success("Password reset instructions sent to your email");
      } else {
        toast.error(data.error ?? "Failed to send reset email");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Card className="mx-auto h-screen w-full overflow-hidden border-0 shadow-none md:h-auto md:max-w-4xl md:border md:shadow-lg">
          <CardContent className="grid h-full p-0 md:grid-cols-2">
            {/* Hero Section - Hidden on mobile */}
            <div className="bg-muted relative hidden md:flex md:flex-col md:justify-center md:p-12">
              <div className="space-y-8">
                <div className="space-y-4">
                  <Logo size="xl" />
                  <div className="space-y-3">
                    <h1 className="text-3xl font-bold lg:text-4xl">
                      Check your
                      <span className="text-primary"> email inbox</span>
                    </h1>
                    <p className="text-muted-foreground text-lg">
                      We&apos;ve sent password reset instructions to your email
                      address. Follow the link to create a new password.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <Mail className="text-primary h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold">Check your inbox</h3>
                      <p className="text-muted-foreground text-sm">
                        Look for an email from beenvoice with reset instructions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <Clock className="text-primary h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold">Link expires soon</h3>
                      <p className="text-muted-foreground text-sm">
                        The reset link is valid for 24 hours only
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <Shield className="text-primary h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold">Secure Process</h3>
                      <p className="text-muted-foreground text-sm">
                        Your account security is our top priority
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 flex items-center space-x-4 rounded-lg p-4">
                  <CheckCircle className="text-primary h-8 w-8" />
                  <div>
                    <p className="font-semibold">Email sent successfully</p>
                    <p className="text-muted-foreground text-sm">
                      Follow the instructions in your email to reset your
                      password
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Success Message */}
            <div className="flex flex-col justify-center p-6 md:p-12">
              <div className="mx-auto w-full max-w-sm space-y-6">
                {/* Mobile Logo */}
                <div className="flex justify-center md:hidden">
                  <Logo size="lg" />
                </div>

                <div className="space-y-2 text-center">
                  <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                    <CheckCircle className="text-primary h-8 w-8" />
                  </div>
                  <h1 className="text-2xl font-bold">Check your email</h1>
                  <p className="text-muted-foreground">
                    We&apos;ve sent password reset instructions to{" "}
                    <span className="font-medium">{email}</span>
                  </p>
                </div>

                <div className="bg-muted/50 space-y-3 rounded-lg p-4">
                  <h3 className="font-semibold">What&apos;s next?</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start space-x-2">
                      <span className="text-primary">1.</span>
                      <span>Check your email inbox (and spam folder)</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-primary">2.</span>
                      <span>Click the reset link in the email</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-primary">3.</span>
                      <span>Create a new secure password</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      setSent(false);
                      setEmail("");
                    }}
                    variant="outline"
                    className="h-11 w-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Try a different email
                  </Button>

                  <a href="/auth/signin">
                    <Button className="h-11 w-full">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Button>
                  </a>
                </div>

                <div className="text-muted-foreground text-center text-xs">
                  Didn&apos;t receive the email? Check your spam folder or{" "}
                  <button
                    onClick={() => {
                      setSent(false);
                      toast.info("You can try sending the email again");
                    }}
                    className="text-primary hover:underline"
                  >
                    try again
                  </button>
                  .
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <Card className="mx-auto h-screen w-full overflow-hidden border-0 shadow-none md:h-auto md:max-w-4xl md:border md:shadow-lg">
        <CardContent className="grid h-full p-0 md:grid-cols-2">
          {/* Hero Section - Hidden on mobile */}
          <div className="bg-muted relative hidden md:flex md:flex-col md:justify-center md:p-12">
            <div className="space-y-8">
              <div className="space-y-4">
                <Logo size="xl" />
                <div className="space-y-3">
                  <h1 className="text-3xl font-bold lg:text-4xl">
                    Forgot your
                    <span className="text-primary"> password?</span>
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    No worries! Enter your email address and we&apos;ll send you
                    instructions to reset your password.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="flex items-start space-x-4">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <Mail className="text-primary h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold">Email Instructions</h3>
                    <p className="text-muted-foreground text-sm">
                      We&apos;ll send a secure link to your email address
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <Clock className="text-primary h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold">Quick Process</h3>
                    <p className="text-muted-foreground text-sm">
                      Reset your password in just a few clicks
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <Shield className="text-primary h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold">Secure & Safe</h3>
                    <p className="text-muted-foreground text-sm">
                      Your account security is our top priority
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Forgot Password Form */}
          <div className="flex flex-col justify-center p-6 md:p-12">
            <div className="mx-auto w-full max-w-sm space-y-6">
              {/* Mobile Logo */}
              <div className="flex justify-center md:hidden">
                <Logo size="lg" />
              </div>

              <div className="space-y-2 text-center md:text-left">
                <h1 className="text-2xl font-bold">Forgot Password</h1>
                <p className="text-muted-foreground">
                  Enter your email and we&apos;ll send you reset instructions
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      className="h-11 pl-10"
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="border-primary-foreground/30 border-t-primary-foreground h-4 w-4 animate-spin rounded-full border-2"></div>
                      <span>Sending instructions...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Send Reset Instructions</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Mail className="text-primary mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Check your spam folder</p>
                    <p className="text-muted-foreground text-sm">
                      Sometimes our emails end up in spam or promotions folders
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <a
                  href="/auth/signin"
                  className="text-primary inline-flex items-center space-x-1 text-sm font-medium hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Back to Sign In</span>
                </a>
              </div>

              <div className="text-muted-foreground text-center text-xs">
                Remember your password?{" "}
                <a
                  href="/auth/signin"
                  className="text-primary font-medium hover:underline"
                >
                  Sign in instead
                </a>
              </div>

              <LegalAgreementNotice
                action="using our service"
                className="leading-relaxed"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
