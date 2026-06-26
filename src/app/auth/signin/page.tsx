import { Suspense } from "react";
import { env } from "~/env";
import { SignInForm } from "./signin-form";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-dashboard text-muted-foreground flex min-h-screen items-center justify-center text-sm">
          Loading…
        </div>
      }
    >
      <SignInForm allowRegistration={env.DISABLE_SIGNUPS !== true} />
    </Suspense>
  );
}
