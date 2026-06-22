-- 0015 may have been recorded before the column name was corrected (send_reminder_at vs sendReminderAt).
ALTER TABLE "beenvoice_invoice" DROP COLUMN IF EXISTS "send_reminder_at";
ALTER TABLE "beenvoice_invoice" ADD COLUMN IF NOT EXISTS "sendReminderAt" timestamp;
