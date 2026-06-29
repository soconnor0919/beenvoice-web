import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { sendPasswordResetForUser } from "~/lib/password-reset";
import { rateLimitKey, requireRateLimit } from "~/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email: string };

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const ipRateLimit = requireRateLimit(rateLimitKey(request, "auth:forgot"), {
      windowMs: 60 * 60 * 1000,
      max: 10,
    });
    if (ipRateLimit) return ipRateLimit;

    const emailRateLimit = requireRateLimit(
      rateLimitKey(request, "auth:forgot-email", normalizedEmail),
      {
        windowMs: 60 * 60 * 1000,
        max: 3,
      },
    );
    if (emailRateLimit) return emailRateLimit;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
      columns: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message:
            "If an account with that email exists, password reset instructions have been sent.",
        },
        { status: 200 },
      );
    }

    await sendPasswordResetForUser(user.id);

    return NextResponse.json(
      {
        success: true,
        message:
          "If an account with that email exists, password reset instructions have been sent.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 },
    );
  }
}
