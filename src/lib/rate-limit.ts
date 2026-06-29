import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

type RateLimitRule = {
  windowMs: number;
  max: number;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitRecord>();

function clientIp(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function hashRateLimitPart(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function rateLimitKey(request: NextRequest, scope: string, subject?: string) {
  const parts = [scope, clientIp(request)];
  if (subject) parts.push(hashRateLimitPart(subject.toLowerCase().trim()));
  return parts.join(":");
}

function retryAfterSeconds(resetAt: number) {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
}

export function checkRateLimit(key: string, rule: RateLimitRule) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count <= rule.max) {
    return { allowed: true, retryAfter: 0 };
  }

  return { allowed: false, retryAfter: retryAfterSeconds(existing.resetAt) };
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many attempts. Please wait and try again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Retry-After": String(retryAfter),
      },
    },
  );
}

export function requireRateLimit(key: string, rule: RateLimitRule) {
  const result = checkRateLimit(key, rule);
  return result.allowed ? null : rateLimitResponse(result.retryAfter);
}
