import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";
import { db } from "~/server/db";
import * as schema from "~/server/db/schema";

const authentikEnabled = Boolean(
  process.env.AUTHENTIK_ISSUER &&
    process.env.AUTHENTIK_CLIENT_ID &&
    process.env.AUTHENTIK_CLIENT_SECRET,
);
const signupsDisabled = process.env.DISABLE_SIGNUPS === "true";

// Derive the authentik origin from the issuer URL so the OAuth callback is
// automatically trusted without needing a separate AUTHENTIK_ORIGIN env var.
const authentikOrigin =
  authentikEnabled && process.env.AUTHENTIK_ISSUER
    ? new URL(process.env.AUTHENTIK_ISSUER).origin
    : null;

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.AUTH_SECRET,
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
  trustedOrigins: [
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
    "beenvoice://",
    "exp://",
    ...(authentikOrigin ? [authentikOrigin] : []),
    ...(process.env.AUTHENTIK_ORIGIN ? [process.env.AUTHENTIK_ORIGIN] : []),
  ],
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
