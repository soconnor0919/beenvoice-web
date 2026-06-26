"use client";

import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

function resolveAuthBaseUrl(): string | undefined {
  // Always use the current origin in the browser so dev works on any port
  // (e.g. 3002 when 3000 is taken), without rebuilding for NEXT_PUBLIC_APP_URL.
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_APP_URL;
}

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(),
  plugins: [genericOAuthClient()],
});
