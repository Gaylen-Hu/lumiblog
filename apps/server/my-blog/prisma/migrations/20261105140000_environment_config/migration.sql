CREATE TABLE "environment_config" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "city" TEXT NOT NULL DEFAULT '杭州',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  "latitude" DOUBLE PRECISION NOT NULL DEFAULT 30.2741,
  "longitude" DOUBLE PRECISION NOT NULL DEFAULT 120.1551,
  "preset" TEXT NOT NULL DEFAULT 'auto',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "environment_config_pkey" PRIMARY KEY ("id")
);
