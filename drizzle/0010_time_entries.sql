CREATE TABLE IF NOT EXISTS "beenvoice_time_entry" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"description" varchar(500) DEFAULT '' NOT NULL,
	"clientId" varchar(255),
	"startedAt" timestamp NOT NULL,
	"endedAt" timestamp,
	"hours" real,
	"rate" real,
	"notes" varchar(500),
	"createdById" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beenvoice_time_entry_clientId_beenvoice_client_id_fk'
  ) THEN
    ALTER TABLE "beenvoice_time_entry" ADD CONSTRAINT "beenvoice_time_entry_clientId_beenvoice_client_id_fk" FOREIGN KEY ("clientId") REFERENCES "public"."beenvoice_client"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beenvoice_time_entry_createdById_beenvoice_user_id_fk'
  ) THEN
    ALTER TABLE "beenvoice_time_entry" ADD CONSTRAINT "beenvoice_time_entry_createdById_beenvoice_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."beenvoice_user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "time_entry_created_by_idx" ON "beenvoice_time_entry" USING btree ("createdById");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "time_entry_client_id_idx" ON "beenvoice_time_entry" USING btree ("clientId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "time_entry_started_at_idx" ON "beenvoice_time_entry" USING btree ("startedAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "time_entry_ended_at_idx" ON "beenvoice_time_entry" USING btree ("endedAt");
