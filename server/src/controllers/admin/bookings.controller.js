import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { assertSlotAllowed } from "../../lib/slotValidator.js";

export async function listBookingsAdmin(req, res, next) {
  try {
    const { status, from, to, city, technicianId, paymentStatus } = req.query;
    const where = {};
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (technicianId) where.technicianId = technicianId === "unassigned" ? null : technicianId;
    if (city) where.site = { addressJson: { path: ["city"], equals: city } };
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
      orderBy: { scheduledDate: "asc" },
    });
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
}

export async function getBookingAdmin(req, res, next) {
  try {
    let booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        site: true,
        service: true,
        amcPlan: true,
        technician: { include: { user: true } },
        payments: true,
        serviceReport: true,
        activityLog: { orderBy: { createdAt: "desc" }, include: { actor: { select: { id: true, name: true } } } },
      },
    });
    if (!booking) return next(notFound("Booking not found"));

    if (!booking.viewedByAdminAt) {
      booking = await prisma.booking.update({
        where: { id: booking.id },
        data: { viewedByAdminAt: new Date() },
        include: {
          user: true,
          site: true,
          service: true,
          amcPlan: true,
          technician: { include: { user: true } },
          payments: true,
          serviceReport: true,
          activityLog: { orderBy: { createdAt: "desc" }, include: { actor: { select: { id: true, name: true } } } },
        },
      });
    }

    res.json({ booking });
  } catch (err) {
    next(err);
  }
}

const rescheduleSchema = z.object({
  scheduledDate: z.coerce.date(),
  slotStart: z.string().regex(/^\d{2}:\d{2}$/),
  slotEnd: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function rescheduleBooking(req, res, next) {
  try {
    const data = rescheduleSchema.parse(req.body);
    assertSlotAllowed(data.slotStart, data.slotEnd);

    const existing = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(notFound("Booking not found"));

    const oldDateLabel = existing.scheduledDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const newDateLabel = data.scheduledDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const message = `Rescheduled: ${oldDateLabel} ${existing.slotStart}-${existing.slotEnd} → ${newDateLabel} ${data.slotStart}-${data.slotEnd}`;

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        scheduledDate: data.scheduledDate,
        slotStart: data.slotStart,
        slotEnd: data.slotEnd,
        rescheduledAt: new Date(),
        rescheduleAcknowledgedAt: null, // re-arm the customer-facing banner for the new date
        activityLog: { create: { message, actorId: req.user.id } },
      },
      include: { activityLog: { orderBy: { createdAt: "desc" }, include: { actor: { select: { id: true, name: true } } } } },
    });
    res.json({ booking });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid reschedule payload", err.issues));
    if (err instanceof Error && err.message.includes("blocked")) return next(badRequest(err.message));
    next(err);
  }
}

const bulkUpdateSchema = z.object({
  bookingIds: z.array(z.string().min(1)).min(1),
  status: z.enum(["PENDING", "CONFIRMED", "TECHNICIAN_ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  technicianId: z.string().optional(),
});

export async function bulkUpdateBookings(req, res, next) {
  try {
    const data = bulkUpdateSchema.parse(req.body);
    if (!data.status && !data.technicianId) return next(badRequest("Provide a status and/or technicianId to apply"));

    const existingBookings = await prisma.booking.findMany({ where: { id: { in: data.bookingIds } } });
    const technician = data.technicianId
      ? await prisma.technician.findUnique({ where: { id: data.technicianId }, include: { user: true } })
      : null;

    await prisma.$transaction(
      existingBookings.map((existing) => {
        const messages = [];
        if (data.status && data.status !== existing.status) {
          messages.push(`Status changed ${existing.status} → ${data.status}`);
        }
        if (data.technicianId && data.technicianId !== existing.technicianId) {
          messages.push(`Assigned to ${technician?.user?.name ?? "technician"}`);
        }
        return prisma.booking.update({
          where: { id: existing.id },
          data: {
            ...(data.status ? { status: data.status } : {}),
            ...(data.technicianId ? { technicianId: data.technicianId } : {}),
            ...(messages.length
              ? { activityLog: { create: messages.map((message) => ({ message, actorId: req.user.id })) } }
              : {}),
          },
        });
      })
    );

    res.json({ updated: existingBookings.length });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid bulk update payload", err.issues));
    next(err);
  }
}
