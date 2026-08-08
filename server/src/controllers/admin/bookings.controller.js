import { prisma } from "../../lib/prisma.js";
import { notFound } from "../../lib/errors.js";

export async function listBookingsAdmin(req, res, next) {
  try {
    const { status, from, to } = req.query;
    const where = {};
    if (status) where.status = status;
    if (from || to) {
      where.scheduledDate = {};
      if (from) where.scheduledDate.gte = new Date(from);
      if (to) where.scheduledDate.lte = new Date(to);
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: true,
        site: true,
        service: true,
        amcPlan: true,
        technician: { include: { user: true } },
      },
      orderBy: { scheduledDate: "desc" },
    });
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
}

export async function getBookingAdmin(req, res, next) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        site: true,
        service: true,
        amcPlan: true,
        technician: { include: { user: true } },
        payments: true,
        serviceReport: true,
      },
    });
    if (!booking) return next(notFound("Booking not found"));
    res.json({ booking });
  } catch (err) {
    next(err);
  }
}
