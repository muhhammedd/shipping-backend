-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cities" TEXT[],
    "baseRate" DECIMAL(10,2) NOT NULL,
    "perKmRate" DECIMAL(10,2) NOT NULL,
    "estimatedDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_time_slots" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "slotDate" TIMESTAMP(3) NOT NULL,
    "slotStart" TEXT NOT NULL,
    "slotEnd" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failed_deliveries" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "failureReason" TEXT NOT NULL,
    "notes" TEXT,
    "photoUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "nextAttemptDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "failed_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_zones_tenantId_idx" ON "delivery_zones"("tenantId");

-- CreateIndex
CREATE INDEX "delivery_zones_tenantId_isActive_idx" ON "delivery_zones"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_time_slots_orderId_key" ON "delivery_time_slots"("orderId");

-- CreateIndex
CREATE INDEX "delivery_time_slots_slotDate_idx" ON "delivery_time_slots"("slotDate");

-- CreateIndex
CREATE INDEX "delivery_time_slots_slotDate_slotStart_idx" ON "delivery_time_slots"("slotDate", "slotStart");

-- CreateIndex
CREATE INDEX "failed_deliveries_orderId_idx" ON "failed_deliveries"("orderId");

-- CreateIndex
CREATE INDEX "failed_deliveries_courierId_idx" ON "failed_deliveries"("courierId");

-- CreateIndex
CREATE INDEX "failed_deliveries_nextAttemptDate_idx" ON "failed_deliveries"("nextAttemptDate");

-- AddForeignKey
ALTER TABLE "delivery_time_slots" ADD CONSTRAINT "delivery_time_slots_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "failed_deliveries" ADD CONSTRAINT "failed_deliveries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "failed_deliveries" ADD CONSTRAINT "failed_deliveries_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "courier_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
