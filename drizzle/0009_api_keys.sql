CREATE TABLE IF NOT EXISTS "beenvoice_api_key" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"keyHash" varchar(64) NOT NULL,
	"keyPrefix" varchar(16) NOT NULL,
	"userId" varchar(255) NOT NULL,
	"lastUsedAt" timestamp,
	"expiresAt" timestamp,
	"revokedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "beenvoice_api_key_keyHash_unique" UNIQUE("keyHash")
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beenvoice_api_key_userId_beenvoice_user_id_fk'
  ) THEN
    ALTER TABLE "beenvoice_api_key" ADD CONSTRAINT "beenvoice_api_key_userId_beenvoice_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."beenvoice_user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_key_hash_idx" ON "beenvoice_api_key" USING btree ("keyHash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_key_user_id_idx" ON "beenvoice_api_key" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_key_revoked_at_idx" ON "beenvoice_api_key" USING btree ("revokedAt");
