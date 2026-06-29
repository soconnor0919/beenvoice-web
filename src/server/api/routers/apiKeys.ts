import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  createApiKeySecret,
  getApiKeyDisplayPrefix,
  hashApiKey,
} from "~/server/api/api-keys";
import { createTRPCRouter, sessionProcedure } from "~/server/api/trpc";
import { apiKeys } from "~/server/db/schema";

export const apiKeysRouter = createTRPCRouter({
  list: sessionProcedure.query(async ({ ctx }) => {
    return ctx.db.query.apiKeys.findMany({
      where: eq(apiKeys.userId, ctx.session.user.id),
      columns: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: (apiKeys, { desc }) => [desc(apiKeys.createdAt)],
    });
  }),

  create: sessionProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(100),
        expiresAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.expiresAt && input.expiresAt <= new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Expiration must be in the future",
        });
      }

      const key = createApiKeySecret();
      const [apiKey] = await ctx.db
        .insert(apiKeys)
        .values({
          name: input.name,
          keyHash: hashApiKey(key),
          keyPrefix: getApiKeyDisplayPrefix(key),
          userId: ctx.session.user.id,
          expiresAt: input.expiresAt ?? null,
        })
        .returning({
          id: apiKeys.id,
          name: apiKeys.name,
          keyPrefix: apiKeys.keyPrefix,
          expiresAt: apiKeys.expiresAt,
          createdAt: apiKeys.createdAt,
        });

      if (!apiKey) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create API key",
        });
      }

      return { ...apiKey, key };
    }),

  revoke: sessionProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const [apiKey] = await ctx.db
        .update(apiKeys)
        .set({ revokedAt: now, updatedAt: now })
        .where(
          and(eq(apiKeys.id, input.id), eq(apiKeys.userId, ctx.session.user.id)),
        )
        .returning({ id: apiKeys.id });

      if (!apiKey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      return { success: true };
    }),

  revokeAll: sessionProcedure.mutation(async ({ ctx }) => {
    const now = new Date();
    await ctx.db
      .update(apiKeys)
      .set({ revokedAt: now, updatedAt: now })
      .where(eq(apiKeys.userId, ctx.session.user.id));

    return { success: true };
  }),
});
