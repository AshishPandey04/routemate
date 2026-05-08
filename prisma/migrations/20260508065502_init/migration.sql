-- CreateEnum
CREATE TYPE "Role" AS ENUM ('RIDER', 'DRIVER', 'BOTH');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIAL_REFUND');

-- CreateEnum
CREATE TYPE "ReturnSlotStatus" AS ENUM ('OPEN', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RatingType" AS ENUM ('RIDER_TO_DRIVER', 'DRIVER_TO_RIDER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'RIDER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Car" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "isAC" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "originLat" DOUBLE PRECISION NOT NULL,
    "originLng" DOUBLE PRECISION NOT NULL,
    "destinationLat" DOUBLE PRECISION NOT NULL,
    "destinationLng" DOUBLE PRECISION NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "estimatedArrival" TIMESTAMP(3) NOT NULL,
    "routeCities" TEXT[],
    "totalSeats" INTEGER NOT NULL,
    "pricePerKm" DOUBLE PRECISION NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "encodedPolyline" TEXT NOT NULL,
    "allowSharing" BOOLEAN NOT NULL DEFAULT true,
    "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',
    "cancellationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Waypoint" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "cityName" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "sequenceIndex" INTEGER NOT NULL,
    "estimatedArrival" TIMESTAMP(3) NOT NULL,
    "actualArrival" TIMESTAMP(3),

    CONSTRAINT "Waypoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatSegment" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromIndex" INTEGER NOT NULL,
    "toIndex" INTEGER NOT NULL,
    "seatsOccupied" INTEGER NOT NULL,

    CONSTRAINT "SeatSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "boardingCity" TEXT NOT NULL,
    "alightingCity" TEXT NOT NULL,
    "boardingIndex" INTEGER NOT NULL,
    "alightingIndex" INTEGER NOT NULL,
    "seatsBooked" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "isReturnTrip" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "refundId" TEXT,
    "refundAmount" DOUBLE PRECISION,
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnSlot" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "returnOrigin" TEXT NOT NULL,
    "returnDestination" TEXT NOT NULL,
    "estimatedReturnDate" TIMESTAMP(3) NOT NULL,
    "status" "ReturnSlotStatus" NOT NULL DEFAULT 'OPEN',
    "returnTripId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "returnSlotId" TEXT NOT NULL,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromCity" TEXT NOT NULL,
    "toCity" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GpsPing" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GpsPing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "rateeId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "type" "RatingType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Car_plateNumber_key" ON "Car"("plateNumber");

-- CreateIndex
CREATE INDEX "Car_ownerId_idx" ON "Car"("ownerId");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");

-- CreateIndex
CREATE INDEX "Trip_originCity_destinationCity_idx" ON "Trip"("originCity", "destinationCity");

-- CreateIndex
CREATE INDEX "Trip_departureTime_idx" ON "Trip"("departureTime");

-- CreateIndex
CREATE INDEX "Trip_driverId_idx" ON "Trip"("driverId");

-- CreateIndex
CREATE INDEX "Waypoint_tripId_sequenceIndex_idx" ON "Waypoint"("tripId", "sequenceIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Waypoint_tripId_sequenceIndex_key" ON "Waypoint"("tripId", "sequenceIndex");

-- CreateIndex
CREATE UNIQUE INDEX "SeatSegment_bookingId_key" ON "SeatSegment"("bookingId");

-- CreateIndex
CREATE INDEX "SeatSegment_tripId_fromIndex_toIndex_idx" ON "SeatSegment"("tripId", "fromIndex", "toIndex");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_tripId_idx" ON "Booking"("tripId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnSlot_tripId_key" ON "ReturnSlot"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnSlot_returnTripId_key" ON "ReturnSlot"("returnTripId");

-- CreateIndex
CREATE INDEX "ReturnSlot_returnOrigin_returnDestination_idx" ON "ReturnSlot"("returnOrigin", "returnDestination");

-- CreateIndex
CREATE INDEX "ReturnSlot_status_idx" ON "ReturnSlot"("status");

-- CreateIndex
CREATE INDEX "ReturnAlert_returnSlotId_notified_idx" ON "ReturnAlert"("returnSlotId", "notified");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnAlert_userId_returnSlotId_key" ON "ReturnAlert"("userId", "returnSlotId");

-- CreateIndex
CREATE INDEX "RouteAlert_fromCity_toCity_date_notified_idx" ON "RouteAlert"("fromCity", "toCity", "date", "notified");

-- CreateIndex
CREATE INDEX "GpsPing_tripId_timestamp_idx" ON "GpsPing"("tripId", "timestamp");

-- CreateIndex
CREATE INDEX "Message_tripId_createdAt_idx" ON "Message"("tripId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_bookingId_key" ON "Rating"("bookingId");

-- CreateIndex
CREATE INDEX "Rating_rateeId_idx" ON "Rating"("rateeId");

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Waypoint" ADD CONSTRAINT "Waypoint_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatSegment" ADD CONSTRAINT "SeatSegment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnSlot" ADD CONSTRAINT "ReturnSlot_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnAlert" ADD CONSTRAINT "ReturnAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnAlert" ADD CONSTRAINT "ReturnAlert_returnSlotId_fkey" FOREIGN KEY ("returnSlotId") REFERENCES "ReturnSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAlert" ADD CONSTRAINT "RouteAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsPing" ADD CONSTRAINT "GpsPing_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_rateeId_fkey" FOREIGN KEY ("rateeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
