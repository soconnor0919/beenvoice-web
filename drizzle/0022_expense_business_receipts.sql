CREATE INDEX IF NOT EXISTS "expense_business_id_idx" ON "beenvoice_expense" USING btree ("businessId");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "beenvoice_expense_receipt" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "expenseId" varchar(255) NOT NULL,
  "storageKey" varchar(500) NOT NULL,
  "originalFilename" varchar(255) NOT NULL,
  "mimeType" varchar(100) NOT NULL,
  "sizeBytes" integer NOT NULL,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "beenvoice_expense_receipt"
ADD CONSTRAINT "beenvoice_expense_receipt_expenseId_beenvoice_expense_id_fk"
FOREIGN KEY ("expenseId") REFERENCES "public"."beenvoice_expense"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expense_receipt_expense_id_idx" ON "beenvoice_expense_receipt" USING btree ("expenseId");
--> statement-breakpoint
UPDATE "beenvoice_expense" e
SET "businessId" = i."businessId"
FROM "beenvoice_invoice" i
WHERE e."invoiceId" = i.id
  AND e."businessId" IS NULL
  AND i."businessId" IS NOT NULL;
--> statement-breakpoint
UPDATE "beenvoice_expense" e
SET "businessId" = sub.business_id
FROM (
  SELECT
    e2.id AS expense_id,
    (
      SELECT b2.id
      FROM "beenvoice_business" b2
      WHERE b2."createdById" = e2."createdById"
      ORDER BY b2."isDefault" DESC, b2."createdAt" DESC
      LIMIT 1
    ) AS business_id
  FROM "beenvoice_expense" e2
  WHERE e2."businessId" IS NULL
) sub
WHERE e.id = sub.expense_id
  AND sub.business_id IS NOT NULL;
