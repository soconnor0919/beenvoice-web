import { type NextRequest, NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { hashPasswordResetToken } from "~/lib/reset-token";
import { revokeUserSessions } from "~/lib/session-security";
import { rateLimitKey, requireRateLimit } from "~/lib/rate-limit";
import { db } from "~/server/db";
import { accounts, users } from "~/server/db/schema";

export async function POST(request: NextRequest) {
  try {
    const ipRateLimit = requireRateLimit(rateLimitKey(request, "auth:reset"), {
      windowMs: 60 * 1000,
      max: 10,
    });
    if (ipRateLimit) return ipRateLimit;

    const { token, password } = (await request.json()) as {
      token: string;
      password: string;
    };

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 },
      );
    }

    const tokenRateLimit = requireRateLimit(
      rateLimitKey(request, "auth:reset-token", token),
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

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        })
        .where(eq(users.id, user.id));

      const credentialAccount = await tx.query.accounts.findFirst({
        where: and(
          eq(accounts.userId, user.id),
          eq(accounts.providerId, "credential"),
        ),
      });

      if (credentialAccount) {
        await tx
          .update(accounts)
          .set({
            password: hashedPassword,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, credentialAccount.id));
      } else {
        await tx.insert(accounts).values({
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: hashedPassword,
        });
      }
    });

    await revokeUserSessions(user.id);

    return NextResponse.json(
      {
        success: true,
        message: "Password has been reset successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "An error occurred while resetting your password" },
      { status: 500 },
    );
  }
}
