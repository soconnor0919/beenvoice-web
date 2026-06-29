import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { env } from "~/env";
import { APP_EMAIL_DOMAIN } from "~/lib/app-email";
import { getAppUrl } from "~/lib/app-url";
import { generatePasswordResetEmailTemplate } from "~/lib/email-templates";
import {
  createPasswordResetToken,
  hashPasswordResetToken,
} from "~/lib/reset-token";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";

export type PasswordResetResult = {
  success: boolean;
  emailSent: boolean;
  userEmail?: string;
};

export async function sendPasswordResetEmail(input: {
  userEmail: string;
  userName?: string;
  resetToken: string;
}): Promise<PasswordResetResult> {
  if (!env.RESEND_API_KEY) {
    console.warn(
      "Password reset requested, but RESEND_API_KEY is not configured.",
    );
    return { success: true, emailSent: false, userEmail: input.userEmail };
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const resetUrl = `${getAppUrl()}/auth/reset-password?token=${input.resetToken}`;
    const emailTemplate = generatePasswordResetEmailTemplate({
      userEmail: input.userEmail,
      userName: input.userName,
      resetToken: input.resetToken,
      resetUrl,
      expiryHours: 1,
    });
    const fromDomain = env.RESEND_DOMAIN ?? APP_EMAIL_DOMAIN;

    await resend.emails.send({
      from: `beenvoice <noreply@${fromDomain}>`,
      to: input.userEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    return { success: true, emailSent: true, userEmail: input.userEmail };
  } catch (emailError) {
    console.error("Failed to send password reset email:", emailError);
    return { success: true, emailSent: false, userEmail: input.userEmail };
  }
}

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

  const resetToken = createPasswordResetToken();
  const resetTokenHash = hashPasswordResetToken(resetToken);
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

  await db
    .update(users)
    .set({ resetToken: resetTokenHash, resetTokenExpiry })
    .where(eq(users.id, user.id));

  return sendPasswordResetEmail({
    userEmail: user.email,
    userName: user.name ?? undefined,
    resetToken,
  });
}
