import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/** Docker/Compose pass booleans as strings; z.coerce.boolean() treats "false" as true. */
const optionalEnvBoolean = () =>
  z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === "") return undefined;
      if (typeof value === "boolean") return value;
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1") return true;
      if (normalized === "false" || normalized === "0") return false;
      return undefined;
    });

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_URL: z.string().url().optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_DOMAIN: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DB_DISABLE_SSL: optionalEnvBoolean(),
    DISABLE_SIGNUPS: optionalEnvBoolean().default(true),
    CRON_SECRET: z.string().optional(),
    // S3-compatible object storage (optional — local .data/receipts/ fallback when unset)
    S3_ENDPOINT: z.string().url().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    S3_REGION: z.string().optional(),
    // SSO / Authentik (optional)
    AUTHENTIK_ISSUER: z.string().url().optional(),
    AUTHENTIK_CLIENT_ID: z.string().optional(),
    AUTHENTIK_CLIENT_SECRET: z.string().optional(),
    AUTHENTIK_ORIGIN: z.string().url().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: z.string().optional(),
    NEXT_PUBLIC_UMAMI_SCRIPT_URL: z.string().url().optional(),
    NEXT_PUBLIC_AUTHENTIK_ENABLED: optionalEnvBoolean(),
    NEXT_PUBLIC_BRAND_NAME: z.string().optional(),
    NEXT_PUBLIC_BRAND_TAGLINE: z.string().optional(),
    NEXT_PUBLIC_BRAND_LOGO_TEXT: z.string().optional(),
    NEXT_PUBLIC_BRAND_ICON: z.string().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_DOMAIN: process.env.RESEND_DOMAIN,
    NODE_ENV: process.env.NODE_ENV,
    DB_DISABLE_SSL: process.env.DB_DISABLE_SSL,
    DISABLE_SIGNUPS: process.env.DISABLE_SIGNUPS,
    AUTHENTIK_ISSUER: process.env.AUTHENTIK_ISSUER,
    AUTHENTIK_CLIENT_ID: process.env.AUTHENTIK_CLIENT_ID,
    AUTHENTIK_CLIENT_SECRET: process.env.AUTHENTIK_CLIENT_SECRET,
    AUTHENTIK_ORIGIN: process.env.AUTHENTIK_ORIGIN,
    CRON_SECRET: process.env.CRON_SECRET,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    S3_REGION: process.env.S3_REGION,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
    NEXT_PUBLIC_UMAMI_SCRIPT_URL: process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL,
    NEXT_PUBLIC_AUTHENTIK_ENABLED: process.env.NEXT_PUBLIC_AUTHENTIK_ENABLED,
    NEXT_PUBLIC_BRAND_NAME: process.env.NEXT_PUBLIC_BRAND_NAME,
    NEXT_PUBLIC_BRAND_TAGLINE: process.env.NEXT_PUBLIC_BRAND_TAGLINE,
    NEXT_PUBLIC_BRAND_LOGO_TEXT: process.env.NEXT_PUBLIC_BRAND_LOGO_TEXT,
    NEXT_PUBLIC_BRAND_ICON: process.env.NEXT_PUBLIC_BRAND_ICON,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
