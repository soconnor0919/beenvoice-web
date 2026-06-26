ALTER TABLE "beenvoice_user" ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" timestamp;

-- Users who already have a business are treated as onboarded
UPDATE "beenvoice_user" u
SET "onboardingCompletedAt" = COALESCE(u."onboardingCompletedAt", NOW())
WHERE u."onboardingCompletedAt" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "beenvoice_business" b
    WHERE b."createdById" = u."id"
  );
