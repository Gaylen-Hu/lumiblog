/*
  Warnings:

  - The primary key for the `article_tags` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `authorId` on the `articles` table. All the data in the column will be lost.
  - You are about to drop the column `excerpt` on the `articles` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `articles` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[articleId,tagId]` on the table `article_tags` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `article_tags` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `originalName` to the `media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storagePath` to the `media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `media` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StorageType" AS ENUM ('local', 'oss', 's3');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('image', 'video', 'audio', 'document', 'other');

-- DropForeignKey
ALTER TABLE "articles" DROP CONSTRAINT "articles_authorId_fkey";

-- DropIndex
DROP INDEX "articles_authorId_idx";

-- DropIndex
DROP INDEX "articles_status_idx";

-- AlterTable
ALTER TABLE "article_tags" DROP CONSTRAINT "article_tags_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "article_tags_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "articles" DROP COLUMN "authorId",
DROP COLUMN "excerpt",
DROP COLUMN "status",
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'zh-CN',
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "translationGroupId" TEXT,
ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "path" TEXT NOT NULL DEFAULT '/',
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "alt" TEXT,
ADD COLUMN     "mediaType" "MediaType" NOT NULL DEFAULT 'other',
ADD COLUMN     "originalName" TEXT NOT NULL,
ADD COLUMN     "storagePath" TEXT NOT NULL,
ADD COLUMN     "storageType" "StorageType" NOT NULL DEFAULT 'local',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "tags" ADD COLUMN     "articleCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "techStack" TEXT[],
    "coverImage" TEXT,
    "link" TEXT,
    "githubUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_config" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'My Blog',
    "description" TEXT,
    "keywords" TEXT,
    "logo" TEXT,
    "favicon" TEXT,
    "icp" TEXT,
    "gongan" TEXT,
    "copyright" TEXT,
    "analytics" TEXT,
    "analyticsGoogle" TEXT,
    "analyticsBaidu" TEXT,
    "ownerName" TEXT,
    "ownerAvatar" TEXT,
    "ownerBio" TEXT,
    "ownerEmail" TEXT,
    "ownerTechStack" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearsOfExperience" INTEGER,
    "openSourceCount" INTEGER,
    "talkCount" INTEGER,
    "socialGithub" TEXT,
    "socialTwitter" TEXT,
    "socialLinkedin" TEXT,
    "socialWeibo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "article_tags_articleId_tagId_key" ON "article_tags"("articleId", "tagId");

-- CreateIndex
CREATE INDEX "articles_isPublished_idx" ON "articles"("isPublished");

-- CreateIndex
CREATE INDEX "articles_slug_idx" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_translationGroupId_idx" ON "articles"("translationGroupId");

-- CreateIndex
CREATE INDEX "articles_locale_idx" ON "articles"("locale");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
