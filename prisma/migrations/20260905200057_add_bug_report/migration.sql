-- CreateEnum
CREATE TYPE "BugReportKind" AS ENUM ('BUG', 'DISPLAY', 'CONTENT', 'IDEA', 'OTHER');

-- CreateEnum
CREATE TYPE "BugReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "BugReport" (
    "id" TEXT NOT NULL,
    "kind" "BugReportKind" NOT NULL DEFAULT 'BUG',
    "message" TEXT NOT NULL,
    "pageUrl" TEXT,
    "userAgent" TEXT,
    "locale" TEXT,
    "email" TEXT,
    "reporterId" TEXT,
    "status" "BugReportStatus" NOT NULL DEFAULT 'OPEN',
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BugReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BugReport_status_createdAt_idx" ON "BugReport"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "BugReport" ADD CONSTRAINT "BugReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BugReport" ADD CONSTRAINT "BugReport_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
