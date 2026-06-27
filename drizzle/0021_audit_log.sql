CREATE TABLE IF NOT EXISTS "beenvoice_audit_log" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "actorUserId" varchar(255) NOT NULL,
  "action" varchar(100) NOT NULL,
  "targetType" varchar(50) NOT NULL,
  "targetId" varchar(255),
  "metadata" jsonb,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "beenvoice_audit_log"
ADD CONSTRAINT "beenvoice_audit_log_actorUserId_beenvoice_user_id_fk"
FOREIGN KEY ("actorUserId") REFERENCES "public"."beenvoice_user"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_actor_user_id_idx" ON "beenvoice_audit_log" USING btree ("actorUserId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "beenvoice_audit_log" USING btree ("action");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_created_at_idx" ON "beenvoice_audit_log" USING btree ("createdAt");
