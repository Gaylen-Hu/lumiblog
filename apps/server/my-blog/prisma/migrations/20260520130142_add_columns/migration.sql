-- CreateEnum
CREATE TYPE "ColumnStatus" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "columns" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "slug" TEXT NOT NULL,
    "description" VARCHAR(500),
    "coverImage" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ColumnStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "column_articles" (
    "id" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "column_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "columns_slug_key" ON "columns"("slug");

-- CreateIndex
CREATE INDEX "columns_status_idx" ON "columns"("status");

-- CreateIndex
CREATE INDEX "columns_sortOrder_idx" ON "columns"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "column_articles_columnId_articleId_key" ON "column_articles"("columnId", "articleId");

-- CreateIndex
CREATE INDEX "column_articles_columnId_sortOrder_idx" ON "column_articles"("columnId", "sortOrder");

-- AddForeignKey
ALTER TABLE "column_articles" ADD CONSTRAINT "column_articles_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "column_articles" ADD CONSTRAINT "column_articles_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
