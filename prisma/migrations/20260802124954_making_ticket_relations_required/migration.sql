/*
  Warnings:

  - Made the column `eventId` on table `Ticket` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userId` on table `Ticket` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "eventId" SET NOT NULL,
ALTER COLUMN "userId" SET NOT NULL;
