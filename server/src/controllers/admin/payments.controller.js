import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { toCsv } from "../../lib/csv.js";

function buildWhere(query) {
  const { status, search, from, to } = query;
  const where = {};
  if (status) where.status = status;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  if (search) {
    where.booking = {
      user: {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      },
    };
  }
  return where;
}

export async function listPayments(req, res, next) {
  try {
    const payments = await prisma.payment.findMany({
      where: buildWhere(req.query),
      include: { booking: { include: { user: true, service: true, amcPlan: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ payments });
  } catch (err) {
    next(err);
  }
}

// Payment rows only ever exist for an actual attempted transaction (webhook or
// admin mark-paid), so "pending" isn't a Payment status here — it's read off
// Booking.paymentStatus, i.e. money owed on bookings with no successful payment yet.
export async function getSummary(_req, res, next) {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [collectedThisMonth, allTimeCollected, refunded, pendingBookings] = await Promise.all([
      prisma.payment.aggregate({ where: { status: "SUCCESSFUL", createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: "SUCCESSFUL" }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: "REFUNDED" }, _sum: { amount: true } }),
      prisma.booking.aggregate({ where: { paymentStatus: "PENDING" }, _sum: { priceAmount: true } }),
    ]);

    res.json({
      collectedThisMonth: collectedThisMonth._sum.amount ?? 0,
      totalPending: pendingBookings._sum.priceAmount ?? 0,
      totalRefunded: refunded._sum.amount ?? 0,
      totalAllTime: allTimeCollected._sum.amount ?? 0,
    });
  } catch (err) {
    next(err);
  }
}

const markPaidSchema = z.object({ method: z.string().optional() });

export async function markPaid(req, res, next) {
  try {
    const data = markPaidSchema.parse(req.body);
    const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId } });
    if (!booking) return next(notFound("Booking not found"));
    if (booking.paymentStatus === "SUCCESSFUL") return next(badRequest("This booking is already marked paid"));

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          bookingId: booking.id,
          gatewayRef: `offline_${randomUUID()}`,
          amount: booking.priceAmount,
          status: "SUCCESSFUL",
          method: data.method ?? "offline",
        },
      });
      await tx.booking.updateMany({ where: { id: booking.id, status: "PENDING" }, data: { status: "CONFIRMED" } });
      await tx.booking.update({ where: { id: booking.id }, data: { paymentStatus: "SUCCESSFUL" } });
      return created;
    });

    res.status(201).json({ payment });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid payload", err.issues));
    next(err);
  }
}

export async function exportPayments(req, res, next) {
  try {
    const payments = await prisma.payment.findMany({
      where: buildWhere(req.query),
      include: { booking: { include: { user: true, service: true, amcPlan: true } } },
      orderBy: { createdAt: "desc" },
    });

    const csv = toCsv(
      [
        { label: "Payment ID", value: (p) => p.id },
        { label: "Booking ID", value: (p) => p.bookingId },
        { label: "Customer", value: (p) => p.booking?.user?.name },
        { label: "Phone", value: (p) => p.booking?.user?.phone },
        { label: "Service / Plan", value: (p) => p.booking?.service?.name ?? p.booking?.amcPlan?.name },
        { label: "Amount", value: (p) => p.amount },
        { label: "Method", value: (p) => p.method },
        { label: "Status", value: (p) => p.status },
        { label: "Gateway Ref", value: (p) => p.gatewayRef },
        { label: "Date", value: (p) => p.createdAt.toISOString() },
      ],
      payments
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="payments-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}
