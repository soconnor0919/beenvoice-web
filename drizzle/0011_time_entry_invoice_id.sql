ALTER TABLE "beenvoice_time_entry" ADD COLUMN IF NOT EXISTS "invoiceId" varchar(255);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beenvoice_time_entry_invoiceId_beenvoice_invoice_id_fk'
  ) THEN
    ALTER TABLE "beenvoice_time_entry" ADD CONSTRAINT "beenvoice_time_entry_invoiceId_beenvoice_invoice_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."beenvoice_invoice"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "time_entry_invoice_id_idx" ON "beenvoice_time_entry" USING btree ("invoiceId");
