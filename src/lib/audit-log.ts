import { db } from "~/server/db";
import { auditLog } from "~/server/db/schema";

export type AuditAction =
  | "user.profile_updated"
  | "user.role_updated"
  | "user.password_reset_sent"
  | "platform.pdf_settings_updated";

export type AuditTargetType = "user" | "platform";

type LogAuditEventInput = {
  actorUserId: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export async function logAuditEvent(input: LogAuditEventInput): Promise<void> {
  await db.insert(auditLog).values({
    actorUserId: input.actorUserId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata,
  });
}
