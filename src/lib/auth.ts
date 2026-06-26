import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";
import { envBoolean } from "~/lib/env-boolean";
import { isDemoUser, promoteFirstRealUserIfNeeded } from "~/lib/first-admin";
import { db } from "~/server/db";
import * as schema from "~/server/db/schema";

const authentikEnabled = Boolean(
  process.env.AUTHENTIK_ISSUER &&
    process.env.AUTHENTIK_CLIENT_ID &&
    process.env.AUTHENTIK_CLIENT_SECRET,
);
const signupsDisabled = envBoolean(process.env.DISABLE_SIGNUPS);

// Derive the authentik origin from the issuer URL so the OAuth callback is
// automatically trusted without needing a separate AUTHENTIK_ORIGIN env var.
const authentikOrigin =
  authentikEnabled && process.env.AUTHENTIK_ISSUER
    ? new URL(process.env.AUTHENTIK_ISSUER).origin
    : null;

const staticTrustedOrigins = [
  ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
  "beenvoice://",
  "exp://",
  ...(authentikOrigin ? [authentikOrigin] : []),
  ...(process.env.AUTHENTIK_ORIGIN ? [process.env.AUTHENTIK_ORIGIN] : []),
];

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.AUTH_SECRET,
  advanced: {
    trustedProxyHeaders: true,
  },
  experimental: {
    joins: true,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verificationTokens,
    },
  }),
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (isDemoUser(user)) {
            return;
          }
          await promoteFirstRealUserIfNeeded(user.id);
        },
      },
    },
  },
  trustedOrigins: async (request) => {
    const origins = [...staticTrustedOrigins];

    if (!request) return origins;

    const origin = request.headers.get("origin");
    if (origin) origins.push(origin);

    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
    if (forwardedHost) {
      for (const host of forwardedHost.split(",")) {
        const trimmed = host.trim();
        if (trimmed) origins.push(`${forwardedProto}://${trimmed}`);
      }
    }

    return origins;
  },
  ...(authentikEnabled && {
    accountLinking: {
      enabled: true,
      trustedProviders: ["authentik"],
    },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: signupsDisabled,
    password: {
      hash: async (password) => {
        const bcrypt = await import("bcryptjs");
        return bcrypt.hash(password, 12);
      },
      verify: async ({ hash, password }) => {
        const bcrypt = await import("bcryptjs");
        return bcrypt.compare(password, hash);
      },
    },
  },
  plugins: [
    expo(),
    nextCookies(),
    ...(authentikEnabled
      ? [
          genericOAuth({
            config: [
              {
                providerId: "authentik",
                clientId: process.env.AUTHENTIK_CLIENT_ID!,
                clientSecret: process.env.AUTHENTIK_CLIENT_SECRET!,
                discoveryUrl: `${process.env.AUTHENTIK_ISSUER}/.well-known/openid-configuration`,
                scopes: ["openid", "email", "profile"],
                pkce: true,
              },
            ],
          }),
        ]
      : []),
  ],
});
