import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { users } from "~/server/db/schema";
import type { db as database } from "~/server/db";

export async function requireAdmin(ctx: {
  db: typeof database;
  session: { user: { id: string } };
}) {
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.id, ctx.session.user.id),
    columns: { role: true },
  });

  if (user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}
