/*
  Aus DealerVerificationStatus wird VerificationStatus: dieselbe Pruefung gilt
  jetzt auch fuer Privatverkaeufer und nicht mehr nur fuer Haendler.

  Bewusst ein RENAME. Prisma wollte hier den Typ neu anlegen und dafuer die
  Spalte Dealer.verification loeschen und neu erzeugen -- jeder bereits
  geprueften Haendler waere damit still auf UNVERIFIED zurueckgefallen, ohne
  dass es jemandem aufgefallen waere. Ein RENAME laesst die Werte stehen.

  Die Tabelle DealerVerification faellt weg. Sie enthielt nur Vermerke, die
  beim Umschalten des Hakens entstanden, nie einen Beleg; der Stand selbst
  steht in Dealer.verification und bleibt. An ihre Stelle tritt
  VerificationRequest -- an den Nutzer gehaengt und mit echten Belegen.
*/

-- AlterEnum
ALTER TYPE "DealerVerificationStatus" RENAME TO "VerificationStatus";

-- CreateEnum
CREATE TYPE "VerificationKind" AS ENUM ('PERSON', 'DEALER');

-- CreateEnum
CREATE TYPE "VerificationDocumentType" AS ENUM ('ID_FRONT', 'ID_BACK', 'BUSINESS_REGISTRATION', 'ADDRESS_PROOF');

-- DropForeignKey
ALTER TABLE "DealerVerification" DROP CONSTRAINT "DealerVerification_dealerId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "verification" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "DealerVerification";

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "VerificationKind" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "legalName" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "postalCode" TEXT,
    "city" TEXT NOT NULL,
    "companyName" TEXT,
    "registrationNumber" TEXT,
    "note" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "documentsPurgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationDocument" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" "VerificationDocumentType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationRequest_status_createdAt_idx" ON "VerificationRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationRequest_userId_createdAt_idx" ON "VerificationRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationRequest_reviewedAt_idx" ON "VerificationRequest"("reviewedAt");

-- CreateIndex
CREATE INDEX "VerificationDocument_requestId_idx" ON "VerificationDocument"("requestId");

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "VerificationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
