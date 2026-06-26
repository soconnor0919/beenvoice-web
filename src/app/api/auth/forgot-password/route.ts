import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { Resend } from "resend";
import { env } from "~/env";
import { APP_EMAIL_DOMAIN } from "~/lib/app-email";
import { getAppUrl } from "~/lib/app-url";
import { generatePasswordResetEmailTemplate } from "~/lib/email-templates";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email: string };

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    // Always return success to prevent email enumeration attacks
    // Don't reveal whether the user exists or not
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

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with reset token
    await db
      .update(users)
      .set({
        resetToken,
        resetTokenExpiry,
      })
      .where(eq(users.id, user.id));

    if (!env.RESEND_API_KEY) {
      console.warn(
        "Password reset requested, but RESEND_API_KEY is not configured.",
      );
      return NextResponse.json(
        {
          success: true,
          message:
            "If an account with that email exists, password reset instructions have been sent.",
        },
        { status: 200 },
      );
    }

    // Send password reset email using Resend
    try {
      const resend = new Resend(env.RESEND_API_KEY);
      const resetUrl = `${getAppUrl()}/auth/reset-password?token=${resetToken}`;

      const emailTemplate = generatePasswordResetEmailTemplate({
        userEmail: email,
        userName: user.name ?? undefined,
        resetToken,
        resetUrl,
        expiryHours: 24,
      });

      const fromDomain = env.RESEND_DOMAIN ?? APP_EMAIL_DOMAIN;

      await resend.emails.send({
        from: `beenvoice <noreply@${fromDomain}>`,
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      console.log(`Password reset email sent to: ${email}`);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      // Continue execution - don't fail the request if email fails
      // This prevents revealing whether an account exists based on email delivery
    }

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
