import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";

/** Seeded in drizzle/0014_seed_demo_account.sql for App Store review. */
export const DEMO_USER_EMAIL = "demo@example.com";
export const DEMO_USER_ID = "a0000000-0000-4000-8000-000000000001";

const FIRST_USER_ADMIN_LOCK_KEY = 0x62656e76;

type DbTx = Pick<typeof db, "execute" | "select" | "query" | "update">;

export function isDemoUser(user: {
  email?: string | null;
  id?: string | null;
}): boolean {
  const email = user.email?.toLowerCase();
  return email === DEMO_USER_EMAIL || user.id === DEMO_USER_ID;
}

function nonDemoUserConditions() {
  return and(ne(users.email, DEMO_USER_EMAIL), ne(users.id, DEMO_USER_ID));
}

async function acquireFirstUserAdminLock(tx: DbTx): Promise<void> {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(${FIRST_USER_ADMIN_LOCK_KEY})`,
  );
}

/**
 * Role for a user about to be inserted. Call inside a transaction before insert.
 */
export async function resolveNewUserRole(tx: DbTx): Promise<"admin" | "user"> {
  await acquireFirstUserAdminLock(tx);

  const [result] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(nonDemoUserConditions());

  return (result?.count ?? 0) === 0 ? "admin" : "user";
}

/**
 * Promote the first non-demo user to admin after Better Auth creates them (OAuth, etc.).
 * Safe under concurrent sign-ups: only one non-demo admin is ever assigned.
 */
export async function promoteFirstRealUserIfNeeded(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await acquireFirstUserAdminLock(tx);

    const user = await tx.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, email: true, role: true },
    });

    if (!user || isDemoUser(user)) {
      return;
    }

    const [adminResult] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(nonDemoUserConditions(), eq(users.role, "admin")));

    if ((adminResult?.count ?? 0) > 0) {
      return;
    }

    const [firstRealUser] = await tx
      .select({ id: users.id })
      .from(users)
      .where(nonDemoUserConditions())
      .orderBy(asc(users.createdAt))
      .limit(1);

    if (firstRealUser?.id === userId) {
      await tx.update(users).set({ role: "admin" }).where(eq(users.id, userId));
    }
  });
}
