-- CreateEnum
CREATE TYPE "FieldLeadStatus" AS ENUM ('NOT_CALLED', 'CALLED_NO_ANSWER', 'CALLED_INTERESTED', 'CALLED_NOT_INTERESTED', 'FOLLOWUP_SCHEDULED', 'CONVERTED', 'LOST');

-- CreateTable
CREATE TABLE "FieldLead" (
    "id" TEXT NOT NULL,
    "houseNumber" TEXT,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "plantCapacityKw" DOUBLE PRECISION,
    "numberOfPanels" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'field_survey',
    "callStatus" "FieldLeadStatus" NOT NULL DEFAULT 'NOT_CALLED',
    "lastCallDate" TIMESTAMP(3),
    "nextFollowupDate" TIMESTAMP(3),
    "assignedToId" TEXT,
    "convertedSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldLeadCallLog" (
    "id" TEXT NOT NULL,
    "fieldLeadId" TEXT NOT NULL,
    "calledById" TEXT NOT NULL,
    "callDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remark" TEXT,
    "outcome" "FieldLeadStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldLeadCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FieldLead_phone_key" ON "FieldLead"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "FieldLead_convertedSubscriptionId_key" ON "FieldLead"("convertedSubscriptionId");

-- CreateIndex
CREATE INDEX "FieldLead_callStatus_idx" ON "FieldLead"("callStatus");

-- AddForeignKey
ALTER TABLE "FieldLead" ADD CONSTRAINT "FieldLead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldLead" ADD CONSTRAINT "FieldLead_convertedSubscriptionId_fkey" FOREIGN KEY ("convertedSubscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldLeadCallLog" ADD CONSTRAINT "FieldLeadCallLog_fieldLeadId_fkey" FOREIGN KEY ("fieldLeadId") REFERENCES "FieldLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldLeadCallLog" ADD CONSTRAINT "FieldLeadCallLog_calledById_fkey" FOREIGN KEY ("calledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
