/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "~/lib/auth";
import {
  hasSessionCookie,
  headersWithAuthCookieFallback,
} from "~/lib/auth-server";
import { checkRateLimit } from "~/lib/rate-limit";
import { db } from "~/server/db";
import { getBearerToken, getUserForApiKey } from "~/server/api/api-keys";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const headers = headersWithAuthCookieFallback(opts.headers);
  const bearerToken = getBearerToken(headers);

  if (bearerToken) {
    const apiKeyAuth = await getUserForApiKey(db, bearerToken);

    if (apiKeyAuth) {
      return {
        db,
        session: {
          user: apiKeyAuth.user,
          session: null,
        },
        authSource: "api-key" as const,
        apiKeyId: apiKeyAuth.apiKeyId,
        ...opts,
        headers,
      };
    }
  }

  if (!hasSessionCookie(headers)) {
    return {
      db,
      session: null,
      authSource: "none" as const,
      apiKeyId: null,
      ...opts,
      headers,
    };
  }

  try {
    const session = await auth.api.getSession({
      headers,
    });

    return {
      db,
      session,
      authSource: session?.user ? ("session" as const) : ("none" as const),
      apiKeyId: null,
      ...opts,
      headers,
    };
  } catch (error) {
    console.error("[tRPC] Failed to resolve session:", error);

    return {
      db,
      session: null,
      authSource: "none" as const,
      apiKeyId: null,
      ...opts,
      headers,
    };
  }
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();
  const result = await next();
  const end = Date.now();

  if (t._config.isDev) {
    console.log(`[TRPC] ${path} took ${end - start}ms to execute`);
  }

  return result;
});

const apiKeyRateLimitMiddleware = t.middleware(({ ctx, next }) => {
  if (ctx.authSource === "api-key" && ctx.apiKeyId) {
    const result = checkRateLimit(`trpc:api-key:${ctx.apiKeyId}`, {
      windowMs: 60 * 1000,
      max: 120,
    });

    if (!result.allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "API key rate limit exceeded. Please try again later.",
      });
    }
  }

  return next();
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure
  .use(timingMiddleware)
  .use(apiKeyRateLimitMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });

export const sessionProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.authSource !== "session") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This action requires an authenticated browser or app session",
    });
  }

  return next();
});
