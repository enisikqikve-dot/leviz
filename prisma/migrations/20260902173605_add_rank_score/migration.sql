-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "rankScore" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Vehicle_status_rankScore_publishedAt_idx" ON "Vehicle"("status", "rankScore", "publishedAt");
