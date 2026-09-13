-- CreateTable
CREATE TABLE "PushTicket" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PushTicket_createdAt_idx" ON "PushTicket"("createdAt");

-- AddForeignKey
ALTER TABLE "PushTicket" ADD CONSTRAINT "PushTicket_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "DeviceToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;
