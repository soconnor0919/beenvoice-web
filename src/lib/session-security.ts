import { and, eq, ne } from "drizzle-orm";

import { db } from "~/server/db";
import { sessions } from "~/server/db/schema";

export async function revokeUserSessions(userId: string, exceptToken?: string | null) {
  const condition = exceptToken
    ? and(eq(sessions.userId, userId), ne(sessions.token, exceptToken))
    : eq(sessions.userId, userId);

  await db.delete(sessions).where(condition);
}
