-- CreateTable
CREATE TABLE "api_quotas" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_quotas_tenantId_idx" ON "api_quotas"("tenantId");

-- CreateIndex
CREATE INDEX "api_quotas_periodStart_periodEnd_idx" ON "api_quotas"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "api_quotas_tenantId_periodStart_key" ON "api_quotas"("tenantId", "periodStart");

-- AddForeignKey
ALTER TABLE "api_quotas" ADD CONSTRAINT "api_quotas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
