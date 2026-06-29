ALTER TABLE "beenvoice_invoice_item" ADD COLUMN IF NOT EXISTS "timeEntryId" varchar(255);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beenvoice_invoice_item_timeEntryId_beenvoice_time_entry_id_fk'
  ) THEN
    ALTER TABLE "beenvoice_invoice_item" ADD CONSTRAINT "beenvoice_invoice_item_timeEntryId_beenvoice_time_entry_id_fk" FOREIGN KEY ("timeEntryId") REFERENCES "public"."beenvoice_time_entry"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_item_time_entry_id_idx" ON "beenvoice_invoice_item" USING btree ("timeEntryId") WHERE "timeEntryId" is not null;
