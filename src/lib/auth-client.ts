"use client";

import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

import { getAppUrl } from "~/lib/app-url";

function resolveAuthBaseUrl(): string | undefined {
  return getAppUrl();
}

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(),
  plugins: [genericOAuthClient()],
});
