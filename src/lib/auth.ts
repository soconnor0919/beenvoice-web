import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";
import { env } from "~/env";
import { isDemoUser, promoteFirstRealUserIfNeeded } from "~/lib/first-admin";
import { sendPasswordResetEmail } from "~/lib/password-reset";
import { db } from "~/server/db";
import * as schema from "~/server/db/schema";

const authentikEnabled = Boolean(
  process.env.AUTHENTIK_ISSUER &&
    process.env.AUTHENTIK_CLIENT_ID &&
    process.env.AUTHENTIK_CLIENT_SECRET,
);
const signupsDisabled = env.DISABLE_SIGNUPS;

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
  ...(env.NODE_ENV === "development"
    ? ["exp://", "http://localhost:3000", "http://127.0.0.1:3000"]
    : []),
  ...(authentikOrigin ? [authentikOrigin] : []),
  ...(process.env.AUTHENTIK_ORIGIN ? [process.env.AUTHENTIK_ORIGIN] : []),
];

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.AUTH_SECRET,
  advanced: {
    trustedProxyHeaders: true,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": {
        window: 60,
        max: 10,
      },
      "/sign-up/email": {
        window: 60 * 60,
        max: 5,
      },
      "/request-password-reset": {
        window: 60 * 60,
        max: 5,
      },
      "/reset-password": {
        window: 60,
        max: 10,
      },
    },
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
  trustedOrigins: staticTrustedOrigins,
  ...(authentikEnabled && {
    accountLinking: {
      enabled: true,
      trustedProviders: ["authentik"],
    },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: signupsDisabled,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      await sendPasswordResetEmail({
        userEmail: user.email,
        userName: user.name ?? undefined,
        resetToken: token,
      });
    },
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
