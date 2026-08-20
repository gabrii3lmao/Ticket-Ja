-- CreateEnum
CREATE TYPE "OrganizerApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "OrganizerAplication" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "document" VARCHAR(14) NOT NULL,
    "status" "OrganizerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "OrganizerAplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizerAplication_document_key" ON "OrganizerAplication"("document");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizerAplication_userId_key" ON "OrganizerAplication"("userId");

-- CreateIndex
CREATE INDEX "OrganizerAplication_status_idx" ON "OrganizerAplication"("status");

-- AddForeignKey
ALTER TABLE "OrganizerAplication" ADD CONSTRAINT "OrganizerAplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
