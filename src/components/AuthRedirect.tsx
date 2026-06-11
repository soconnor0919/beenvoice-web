"use client";

import { authClient } from "~/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    let isCurrent = true;

    async function redirectAuthenticatedUser() {
      const { data: session } = await authClient.getSession().catch(() => ({
        data: null,
      }));

      if (isCurrent && session?.user) {
        router.push("/dashboard");
      }
    }

    void redirectAuthenticatedUser();

    return () => {
      isCurrent = false;
    };
  }, [router]);

  // This component doesn't render anything
  return null;
}
