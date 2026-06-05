import { createHash, randomBytes } from "node:crypto";

import { and, eq, isNull, or, gt } from "drizzle-orm";

import { apiKeys } from "~/server/db/schema";
import type { db } from "~/server/db";

const API_KEY_PREFIX = "bv";
const API_KEY_SECRET_BYTES = 32;

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function createApiKeySecret() {
  const secret = randomBytes(API_KEY_SECRET_BYTES).toString("base64url");
  return `${API_KEY_PREFIX}_${secret}`;
}

export function getApiKeyDisplayPrefix(key: string) {
  return key.slice(0, 16);
}

export function getBearerToken(headers: Headers) {
  const authorization = headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  const xApiKey = headers.get("x-api-key");
  return xApiKey?.trim() ?? null;
}

export async function getUserForApiKey(database: typeof db, apiKey: string) {
  const keyHash = hashApiKey(apiKey);
  const now = new Date();

  const record = await database.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.keyHash, keyHash),
      isNull(apiKeys.revokedAt),
      or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
    ),
    with: {
      user: true,
    },
  });

  if (!record?.user) return null;

  await database
    .update(apiKeys)
    .set({ lastUsedAt: now, updatedAt: now })
    .where(eq(apiKeys.id, record.id));

  return {
    apiKeyId: record.id,
    user: record.user,
  };
}
