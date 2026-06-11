"use client";

import { useEffect, useState } from "react";
import { authClient } from "~/lib/auth-client";

type AuthSession = typeof authClient.$Infer.Session;

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    async function loadSession() {
      const { data } = await authClient.getSession().catch(() => ({
        data: null,
      }));

      if (isCurrent) {
        setSession(data);
        setIsPending(false);
      }
    }

    void loadSession();

    return () => {
      isCurrent = false;
    };
  }, []);

  return { data: session, isPending };
}
