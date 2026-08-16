CREATE TYPE "FriendLinkStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REMOVED');

CREATE TABLE "friend_links" (
  "id" TEXT NOT NULL,
  "siteName" VARCHAR(120) NOT NULL,
  "siteUrl" VARCHAR(500) NOT NULL,
  "reciprocalUrl" VARCHAR(500) NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "contactEmail" VARCHAR(254),
  "status" "FriendLinkStatus" NOT NULL DEFAULT 'PENDING',
  "reviewNote" VARCHAR(500),
  "approvedAt" TIMESTAMP(3),
  "removedAt" TIMESTAMP(3),
  "lastCheckedAt" TIMESTAMP(3),
  "lastCheckPassed" BOOLEAN,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "friend_links_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "friend_links_siteUrl_key" ON "friend_links"("siteUrl");
CREATE INDEX "friend_links_status_idx" ON "friend_links"("status");
CREATE INDEX "friend_links_approvedAt_idx" ON "friend_links"("approvedAt");

CREATE TABLE "friend_link_checks" (
  "id" TEXT NOT NULL,
  "friendLinkId" TEXT NOT NULL,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "passed" BOOLEAN NOT NULL,
  "statusCode" INTEGER,
  "message" VARCHAR(1000),
  "foundUrl" VARCHAR(500),
  CONSTRAINT "friend_link_checks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "friend_link_checks_friendLinkId_checkedAt_idx" ON "friend_link_checks"("friendLinkId", "checkedAt");
ALTER TABLE "friend_link_checks" ADD CONSTRAINT "friend_link_checks_friendLinkId_fkey" FOREIGN KEY ("friendLinkId") REFERENCES "friend_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
