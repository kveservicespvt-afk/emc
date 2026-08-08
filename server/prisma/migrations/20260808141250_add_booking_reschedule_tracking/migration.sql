-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "rescheduleAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "rescheduledAt" TIMESTAMP(3);
