import { type NextRequest, NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { hashPasswordResetToken } from "~/lib/reset-token";
import { rateLimitKey, requireRateLimit } from "~/lib/rate-limit";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";

export async function POST(request: NextRequest) {
  try {
    const ipRateLimit = requireRateLimit(rateLimitKey(request, "auth:validate-reset"), {
      windowMs: 60 * 1000,
      max: 20,
    });
    if (ipRateLimit) return ipRateLimit;

    const { token } = (await request.json()) as { token: string };

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const tokenRateLimit = requireRateLimit(
      rateLimitKey(request, "auth:validate-reset-token", token),
      {
        windowMs: 60 * 60 * 1000,
        max: 5,
      },
    );
    if (tokenRateLimit) return tokenRateLimit;

    const tokenHash = hashPasswordResetToken(token);

    // Find user with valid reset token that hasn't expired
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.resetToken, tokenHash),
        gt(users.resetTokenExpiry, new Date()),
      ),
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    return NextResponse.json({ valid: true }, { status: 200 });
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      { error: "An error occurred while validating the token" },
      { status: 500 },
    );
  }
}
