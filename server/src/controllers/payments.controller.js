import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import { badRequest, notFound, forbidden } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const createOrderSchema = z.object({ bookingId: z.string().min(1) });

// In real mode this would call the Razorpay Orders API with RAZORPAY_KEY_ID/SECRET.
// Pass 3 wires that in; for now it returns a mock order object shaped the same way
// so the frontend checkout integration doesn't need to change later.
export async function createOrder(req, res, next) {
  try {
    const { bookingId } = createOrderSchema.parse(req.body);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return next(notFound("Booking not found"));
    if (booking.userId !== req.user.id) return next(forbidden());
    if (booking.paymentStatus === "SUCCESSFUL") {
      return next(badRequest("This booking has already been paid for"));
    }

    if (!config.razorpayMockMode) {
      // TODO(Pass 3): real Razorpay order creation via razorpay npm SDK.
      return next(badRequest("Live Razorpay integration is not configured yet"));
    }

    const orderId = `order_mock_${randomUUID()}`;
    res.json({
      orderId,
      amount: Math.round(booking.priceAmount * 100), // paise, matches Razorpay's unit
      currency: "INR",
      mockMode: true,
      keyId: "mock_key_id",
    });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid payment payload", err.issues));
    next(err);
  }
}

// Idempotent: gatewayRef has a unique DB constraint, so replaying the same event
// (Razorpay webhooks can fire more than once) never double-credits a payment.
async function processPaymentEvent({ bookingId, gatewayRef, amount, status, method }) {
  const existing = await prisma.payment.findUnique({ where: { gatewayRef } });
  if (existing) {
    logger.info({ gatewayRef }, "Duplicate payment event ignored (idempotent)");
    return { payment: existing, duplicate: true };
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: { bookingId, gatewayRef, amount, status, method: method ?? "razorpay" },
    });

    if (status === "SUCCESSFUL") {
      await tx.booking.updateMany({
        where: { id: bookingId, status: "PENDING" },
        data: { status: "CONFIRMED" },
      });
      await tx.booking.update({ where: { id: bookingId }, data: { paymentStatus: "SUCCESSFUL" } });
    } else {
      await tx.booking.update({ where: { id: bookingId }, data: { paymentStatus: status } });
    }

    return created;
  });

  return { payment, duplicate: false };
}

const webhookSchema = z.object({
  bookingId: z.string().min(1),
  gatewayRef: z.string().min(1),
  amount: z.coerce.number().positive(),
  status: z.enum(["SUCCESSFUL", "FAILED"]),
  method: z.string().optional(),
});

export async function webhook(req, res, next) {
  try {
    // TODO(Pass 3): verify Razorpay's X-Razorpay-Signature header against
    // RAZORPAY_KEY_SECRET before trusting the payload, once live keys exist.
    const data = webhookSchema.parse(req.body);
    const { payment, duplicate } = await processPaymentEvent(data);
    res.json({ payment, duplicate });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid webhook payload", err.issues));
    next(err);
  }
}

const mockPaySchema = z.object({ bookingId: z.string().min(1), orderId: z.string().min(1) });

// Dev-only convenience so the frontend can complete a "payment" without a real
// Razorpay checkout modal. Mirrors exactly what the webhook does.
export async function mockPay(req, res, next) {
  try {
    if (!config.razorpayMockMode) return next(badRequest("Mock payments are disabled"));
    const { bookingId } = mockPaySchema.parse(req.body);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return next(notFound("Booking not found"));
    if (booking.userId !== req.user.id) return next(forbidden());

    const { payment } = await processPaymentEvent({
      bookingId,
      gatewayRef: `pay_mock_${randomUUID()}`,
      amount: booking.priceAmount,
      status: "SUCCESSFUL",
    });
    res.json({ payment });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid payload", err.issues));
    next(err);
  }
}

export async function listMyPayments(req, res, next) {
  try {
    const payments = await prisma.payment.findMany({
      where: { booking: { userId: req.user.id } },
      include: { booking: { include: { service: true, amcPlan: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ payments });
  } catch (err) {
    next(err);
  }
}
