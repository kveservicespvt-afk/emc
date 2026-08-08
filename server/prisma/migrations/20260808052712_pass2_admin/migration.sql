-- CreateEnum
CREATE TYPE "CityStatus" AS ENUM ('LIVE', 'UPCOMING');

-- CreateEnum
CREATE TYPE "DustZone" AS ENUM ('HIGH', 'MODERATE', 'LOW');

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "featuresJson" JSONB;

-- AlterTable
ALTER TABLE "ServiceReport" ADD COLUMN     "featuredOnHomepage" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "status" "CityStatus" NOT NULL DEFAULT 'UPCOMING',
    "dustZone" "DustZone" NOT NULL DEFAULT 'MODERATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "whatsappNumber" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "socialLinksJson" JSONB,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "City_name_state_key" ON "City"("name", "state");
