import crypto from "crypto";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { env } from "~/env";
import { APP_EMAIL_DOMAIN } from "~/lib/app-email";
import { getAppUrl } from "~/lib/app-url";
import { generatePasswordResetEmailTemplate } from "~/lib/email-templates";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";

export type PasswordResetResult = {
  success: boolean;
  emailSent: boolean;
  userEmail?: string;
};

export async function sendPasswordResetForUser(
  userId: string,
): Promise<PasswordResetResult> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, email: true, name: true },
  });

  if (!user) {
    return { success: false, emailSent: false };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db
    .update(users)
    .set({ resetToken, resetTokenExpiry })
    .where(eq(users.id, user.id));

  if (!env.RESEND_API_KEY) {
    console.warn(
      "Password reset requested, but RESEND_API_KEY is not configured.",
    );
    return { success: true, emailSent: false, userEmail: user.email };
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const resetUrl = `${getAppUrl()}/auth/reset-password?token=${resetToken}`;
    const emailTemplate = generatePasswordResetEmailTemplate({
      userEmail: user.email,
      userName: user.name ?? undefined,
      resetToken,
      resetUrl,
      expiryHours: 24,
    });
    const fromDomain = env.RESEND_DOMAIN ?? APP_EMAIL_DOMAIN;

    await resend.emails.send({
      from: `beenvoice <noreply@${fromDomain}>`,
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    return { success: true, emailSent: true, userEmail: user.email };
  } catch (emailError) {
    console.error("Failed to send password reset email:", emailError);
    return { success: true, emailSent: false, userEmail: user.email };
  }
}
