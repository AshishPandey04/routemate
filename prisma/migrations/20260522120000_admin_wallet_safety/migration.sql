-- AlterEnum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADMIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT;

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('EARNING_PENDING', 'EARNING', 'PAYOUT', 'REVERSAL', 'ADJUSTMENT');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "bookingId" TEXT,
    "tripId" TEXT,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "bankRef" TEXT,
    "adminNote" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "refundAmount" DOUBLE PRECISION,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripShareLink" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripShareLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SosAlert" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SosAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");
CREATE INDEX "WalletTransaction_tripId_releasedAt_idx" ON "WalletTransaction"("tripId", "releasedAt");
CREATE INDEX "Payout_status_idx" ON "Payout"("status");
CREATE INDEX "Payout_walletId_idx" ON "Payout"("walletId");
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");
CREATE INDEX "Dispute_bookingId_idx" ON "Dispute"("bookingId");
CREATE UNIQUE INDEX "TripShareLink_tripId_key" ON "TripShareLink"("tripId");
CREATE UNIQUE INDEX "TripShareLink_token_key" ON "TripShareLink"("token");
CREATE INDEX "TripShareLink_token_idx" ON "TripShareLink"("token");
CREATE INDEX "SosAlert_tripId_createdAt_idx" ON "SosAlert"("tripId", "createdAt");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TripShareLink" ADD CONSTRAINT "TripShareLink_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SosAlert" ADD CONSTRAINT "SosAlert_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SosAlert" ADD CONSTRAINT "SosAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
