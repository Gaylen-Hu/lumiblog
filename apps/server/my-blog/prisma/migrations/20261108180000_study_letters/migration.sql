CREATE TABLE "study_letters" (
  "id" UUID PRIMARY KEY, "publicId" UUID NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fingerprint" TEXT, "nickname" TEXT, "body" TEXT, "contact" TEXT,
  "emailKey" TEXT, "claimDigest" TEXT UNIQUE, "visitorId" TEXT, "topic" TEXT,
  "allowPublic" BOOLEAN NOT NULL DEFAULT FALSE, "status" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3), "reviewedAt" TIMESTAMP(3), "reviewedBy" TEXT,
  "readAt" TIMESTAMP(3), "handledAt" TIMESTAMP(3), "deletedAt" TIMESTAMP(3),
  CHECK ("status" IN ('private','pending','declined','published','withdrawn','deleted')),
  CHECK ("status" <> 'published' OR ("allowPublic" AND "publishedAt" IS NOT NULL AND "deletedAt" IS NULL))
);
CREATE INDEX "study_letters_status_publishedAt_publicId_idx" ON "study_letters" ("status","publishedAt","publicId");
CREATE INDEX "study_letters_emailKey_createdAt_idx" ON "study_letters" ("emailKey","createdAt");
