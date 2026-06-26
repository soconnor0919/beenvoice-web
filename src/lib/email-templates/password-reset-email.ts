import { formatEmailDate } from "src/lib/email-utils";
import { SUPPORT_EMAIL } from "~/lib/app-email";

interface PasswordResetEmailProps {
  userEmail: string;
  userName?: string;
  resetToken: string;
  resetUrl: string;
  expiryHours?: number;
}

export function generatePasswordResetEmailTemplate({
  userEmail,
  userName,
  resetUrl,
  expiryHours = 24,
}: PasswordResetEmailProps) {
  const displayName = userName ?? userEmail.split("@")[0];
  const currentDate = formatEmailDate(new Date());

  // HTML version
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset - beenvoice</title>
  <style>
    body {
      font-family: ui-monospace, 'Geist Mono', 'Courier New', monospace;
      line-height: 1.6;
      color: #0f0f0f;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #0f0f0f;
      padding: 32px 32px 24px;
      border-bottom: 1px solid #e5e7eb;
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 32px;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 16px 0;
      color: #0f0f0f;
    }
    .text {
      margin: 0 0 24px 0;
      color: #525252;
      font-size: 14px;
    }
    .button-container {
      margin: 32px 0;
      text-align: center;
    }
    .button {
      display: inline-block;
      background-color: #374151;
      color: #ffffff;
      padding: 12px 24px;
      text-decoration: none;
      font-weight: 500;
      font-size: 14px;
      border: 1px solid #374151;
      border-radius: 0;
      transition: background-color 0.2s;
    }
    .button:hover {
      background-color: #1f2937;
      border-color: #1f2937;
    }
    .security-notice {
      background-color: #f9fafb;
      border-left: 4px solid #374151;
      padding: 16px;
      margin: 24px 0;
      border-radius: 0;
    }
    .security-notice h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: #0f0f0f;
    }
    .security-notice p {
      margin: 0;
      font-size: 13px;
      color: #525252;
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px 32px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
    }
    .footer a {
      color: #374151;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 24px 0;
    }
    @media (max-width: 600px) {
      .container {
        margin: 0;
        border: none;
      }
      .header, .content, .footer {
        padding: 24px 16px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">
        beenvoice
      </h1>
    </div>

    <div class="content">
      <h2 class="title">Reset Your Password</h2>

      <p class="text">Hello ${displayName},</p>

      <p class="text">
        We received a request to reset the password for your beenvoice account.
        If you made this request, click the button below to set a new password.
      </p>

      <div class="button-container">
        <a href="${resetUrl}" class="button">Reset Your Password</a>
      </div>

      <p class="text">
        If the button doesn't work, copy and paste this link into your browser:
        <br>
        <a href="${resetUrl}" style="color: #374151; word-break: break-all;">${resetUrl}</a>
      </p>

      <div class="security-notice">
        <h4>Security Information</h4>
        <p>This password reset link will expire in ${expiryHours} hours for your security.</p>
        <p>If you didn't request this password reset, you can safely ignore this email.</p>
      </div>

      <div class="divider"></div>

      <p class="text">
        If you're having trouble accessing your account or have questions,
        please contact our support team.
      </p>

      <p class="text">
        Best regards,<br>
        The beenvoice Team
      </p>
    </div>

    <div class="footer">
      <p>
        This email was sent to <strong>${userEmail}</strong> on ${currentDate}.
      </p>
      <p>
        beenvoice - Professional invoicing made simple<br>
        <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  // Plain text version
  const text = `
beenvoice - Password Reset

Hello ${displayName},

We received a request to reset the password for your beenvoice account.

To reset your password, please visit this link:
${resetUrl}

SECURITY INFORMATION:
- This link will expire in ${expiryHours} hours
- If you didn't request this reset, you can safely ignore this email
- Never share this link with anyone

If you're having trouble with the link, copy and paste the entire URL into your browser's address bar.

If you have any questions or need assistance, please contact our support team at ${SUPPORT_EMAIL}.

Best regards,
The beenvoice Team

---
This email was sent to ${userEmail} on ${currentDate}.
beenvoice - Professional invoicing made simple
`;

  return {
    html: html.trim(),
    text: text.trim(),
    subject: "Reset Your beenvoice Password",
  };
}
