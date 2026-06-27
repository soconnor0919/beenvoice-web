import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { db as Db } from "~/server/db";
import { businesses } from "~/server/db/schema";

type BusinessContext = {
  db: typeof Db;
  session: { user: { id: string } };
};

export async function verifyBusinessAccess(
  ctx: BusinessContext,
  businessId?: string | null,
) {
  if (!businessId) return null;

  const business = await ctx.db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
  });

  if (!business) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Business not found",
    });
  }

  if (business.createdById !== ctx.session.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have permission to use this business",
    });
  }

  return business;
}

export async function resolveDefaultBusiness(ctx: BusinessContext) {
  const [defaultBusiness] = await ctx.db
    .select()
    .from(businesses)
    .where(eq(businesses.createdById, ctx.session.user.id))
    .orderBy(desc(businesses.isDefault), desc(businesses.createdAt))
    .limit(1);

  return defaultBusiness ?? null;
}

/** Resolve explicit businessId or fall back to the user's default business. */
export async function resolveBusinessForExpense(
  ctx: BusinessContext,
  businessId?: string | null,
) {
  if (businessId && businessId.trim() !== "") {
    return verifyBusinessAccess(ctx, businessId);
  }

  return resolveDefaultBusiness(ctx);
}
