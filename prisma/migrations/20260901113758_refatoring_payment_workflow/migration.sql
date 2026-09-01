/*
  Warnings:

  - The values [REFUNDED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [FAILED,REFUNDED] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `dueDate` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `externalId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `providerData` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the `GatewayCustomer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentWebhookEvent` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[orderId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'PAID', 'CANCELED');
ALTER TABLE "public"."Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');
ALTER TABLE "public"."Payment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "public"."PaymentStatus_old";
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "GatewayCustomer" DROP CONSTRAINT "GatewayCustomer_userId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentAccount" DROP CONSTRAINT "PaymentAccount_organizerProfileId_fkey";

-- DropIndex
DROP INDEX "Payment_provider_externalId_idx";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "dueDate",
DROP COLUMN "externalId",
DROP COLUMN "paidAt",
DROP COLUMN "paymentMethod",
DROP COLUMN "provider",
DROP COLUMN "providerData",
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "rejectReason" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "GatewayCustomer";

-- DropTable
DROP TABLE "PaymentAccount";

-- DropTable
DROP TABLE "PaymentWebhookEvent";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "PaymentProvider";

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");
