"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";
import { Logo } from "~/components/branding/logo";
import { LegalAgreementNotice } from "~/components/legal/legal-links";
import {
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(() =>
    token ? null : false,
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    // Validate token on page load
    const validateToken = async () => {
      try {
        const response = await fetch("/api/auth/validate-reset-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
        }
      } catch {
        setTokenValid(false);
      }
    };

    void validateToken();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid reset token");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = (await response.json()) as { error?: string };

      if (response.ok) {
        setSuccess(true);
        toast.success("Password reset successfully!");
      } else {
        toast.error(data.error ?? "Failed to reset password");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (tokenValid === null) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
          <p className="text-muted-foreground mt-4">
            Validating reset token...
          </p>
        </div>
      </div>
    );
  }

  if (tokenValid === false) {
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
                      Invalid or
                      <span className="text-destructive"> expired link</span>
                    </h1>
                    <p className="text-muted-foreground text-lg">
                      This password reset link is either invalid or has expired.
                      Please request a new password reset.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="bg-destructive/10 rounded-lg p-2">
                      <Shield className="text-destructive h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold">Security First</h3>
                      <p className="text-muted-foreground text-sm">
                        Reset links expire after 24 hours for your security
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Form */}
            <div className="flex flex-col justify-center p-6 md:p-12">
              <div className="mx-auto w-full max-w-sm space-y-6">
                {/* Mobile Logo */}
                <div className="flex justify-center md:hidden">
                  <Logo size="lg" />
                </div>

                <div className="space-y-2 text-center">
                  <div className="bg-destructive/10 justify-content mx-auto mb-4 flex h-16 w-16 items-center rounded-full">
                    <Shield className="text-destructive mx-auto h-8 w-8" />
                  </div>
                  <h1 className="text-2xl font-bold">Link Expired</h1>
                  <p className="text-muted-foreground">
                    This password reset link is no longer valid
                  </p>
                </div>

                <div className="space-y-3">
                  <a href="/auth/forgot-password">
                    <Button className="h-11 w-full">
                      Request New Reset Link
                    </Button>
                  </a>

                  <a href="/auth/signin">
                    <Button variant="outline" className="h-11 w-full">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
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
                      Password
                      <span className="text-primary"> reset complete</span>
                    </h1>
                    <p className="text-muted-foreground text-lg">
                      Your password has been successfully reset. You can now
                      sign in with your new password.
                    </p>
                  </div>
                </div>

                <div className="bg-primary/5 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="text-primary h-6 w-6" />
                    <div>
                      <p className="font-semibold">Security Updated</p>
                      <p className="text-muted-foreground text-sm">
                        Your account is now secured with your new password
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Success Form */}
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
                  <h1 className="text-2xl font-bold">
                    Password Reset Complete
                  </h1>
                  <p className="text-muted-foreground">
                    Your password has been successfully updated
                  </p>
                </div>

                <div className="space-y-3">
                  <a href="/auth/signin">
                    <Button className="h-11 w-full">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Sign In Now
                    </Button>
                  </a>
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
                    Create your
                    <span className="text-primary"> new password</span>
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Choose a strong password to secure your beenvoice account.
                    Make sure it&apos;s something you&apos;ll remember.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="flex items-start space-x-4">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <Shield className="text-primary h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold">Secure Password</h3>
                    <p className="text-muted-foreground text-sm">
                      Use at least 8 characters with a mix of letters and
                      numbers
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <Lock className="text-primary h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold">Account Safety</h3>
                    <p className="text-muted-foreground text-sm">
                      Your new password will immediately secure your account
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reset Password Form */}
          <div className="flex flex-col justify-center p-6 md:p-12">
            <div className="mx-auto w-full max-w-sm space-y-6">
              {/* Mobile Logo */}
              <div className="flex justify-center md:hidden">
                <Logo size="lg" />
              </div>

              <div className="space-y-2 text-center md:text-left">
                <h1 className="text-2xl font-bold">Reset Password</h1>
                <p className="text-muted-foreground">
                  Enter your new password below
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                      className="h-11 pr-10 pl-10"
                      placeholder="Enter new password"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 z-10 -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Must be at least 8 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="h-11 pr-10 pl-10"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 z-10 -translate-y-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
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
                      <span>Updating password...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Update Password</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <a
                  href="/auth/signin"
                  className="text-primary inline-flex items-center space-x-1 text-sm font-medium hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Back to Sign In</span>
                </a>
              </div>

              <LegalAgreementNotice
                action="resetting your password"
                className="leading-relaxed"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
