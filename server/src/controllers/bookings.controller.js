import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { badRequest, notFound, forbidden } from "../lib/errors.js";
import { assertSlotAllowed } from "../lib/slotValidator.js";
import { calculatePrice } from "../lib/pricing.js";

const createBookingSchema = z.object({
  siteId: z.string().min(1),
  serviceId: z.string().min(1),
  scheduledDate: z.coerce.date(),
  slotStart: z.string().regex(/^\d{2}:\d{2}$/),
  slotEnd: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().optional(),
});

export async function createBooking(req, res, next) {
  try {
    const data = createBookingSchema.parse(req.body);
    assertSlotAllowed(data.slotStart, data.slotEnd);

    const site = await prisma.site.findUnique({ where: { id: data.siteId } });
    if (!site || site.userId !== req.user.id) return next(notFound("Site not found"));

    const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
    if (!service || !service.active) return next(notFound("Service not found"));

    const priceAmount = calculatePrice({
      basePrice: service.basePrice,
      pricePerKw: service.pricePerKw,
      plantCapacityKw: site.plantCapacityKw,
    });

    const booking = await prisma.booking.create({
      data: {
        userId: req.user.id,
        siteId: site.id,
        serviceId: service.id,
        scheduledDate: data.scheduledDate,
        slotStart: data.slotStart,
        slotEnd: data.slotEnd,
        plantCapacityKw: site.plantCapacityKw,
        priceAmount,
        notes: data.notes,
      },
      include: { site: true, service: true, technician: { include: { user: true } } },
    });

    res.status(201).json({ booking });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid booking payload", err.issues));
    if (err instanceof Error && err.message.includes("blocked")) return next(badRequest(err.message));
    next(err);
  }
}

// Customers shouldn't see a Service Report the admin is still drafting — only
// surface it once adminApprovedAt is set, so a half-filled report never leaks.
function gateReport(booking) {
  if (booking.serviceReport && !booking.serviceReport.adminApprovedAt) {
    return { ...booking, serviceReport: null, reportPending: true };
  }
  return booking;
}

export async function listMyBookings(req, res, next) {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.id },
      include: {
        site: true,
        service: true,
        amcPlan: true,
        technician: { include: { user: true } },
        payments: true,
        serviceReport: true,
      },
      orderBy: { scheduledDate: "desc" },
    });
    res.json({ bookings: bookings.map(gateReport) });
  } catch (err) {
    next(err);
  }
}

export async function getBooking(req, res, next) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        site: true,
        service: true,
        amcPlan: true,
        technician: { include: { user: true } },
        payments: true,
        serviceReport: true,
        review: true,
      },
    });
    if (!booking) return next(notFound("Booking not found"));
    if (booking.userId !== req.user.id && req.user.role === "CUSTOMER") {
      return next(forbidden());
    }

    // This load is what shows the "rescheduled" banner — respond with the
    // still-unacknowledged booking so the customer actually sees it, then mark
    // it acknowledged in the background so it doesn't show again on the *next*
    // load. Re-armed to null by rescheduleBooking on the next reschedule.
    if (booking.rescheduledAt && !booking.rescheduleAcknowledgedAt) {
      await prisma.booking.update({ where: { id: booking.id }, data: { rescheduleAcknowledgedAt: new Date() } });
    }

    res.json({ booking: gateReport(booking) });
  } catch (err) {
    next(err);
  }
}

const statusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "TECHNICIAN_ASSIGNED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
  ]),
  technicianId: z.string().optional(),
});

export async function updateBookingStatus(req, res, next) {
  try {
    const data = statusSchema.parse(req.body);
    const existing = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { technician: { include: { user: true } } },
    });
    if (!existing) return next(notFound("Booking not found"));

    const messages = [];
    if (data.status !== existing.status) {
      messages.push(`Status changed ${existing.status} → ${data.status}`);
    }
    if (data.technicianId && data.technicianId !== existing.technicianId) {
      const technician = await prisma.technician.findUnique({ where: { id: data.technicianId }, include: { user: true } });
      messages.push(`Assigned to ${technician?.user?.name ?? "technician"}`);
    }

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        status: data.status,
        ...(data.technicianId ? { technicianId: data.technicianId } : {}),
        ...(messages.length
          ? { activityLog: { create: messages.map((message) => ({ message, actorId: req.user.id })) } }
          : {}),
      },
      include: { technician: { include: { user: true } }, activityLog: { orderBy: { createdAt: "desc" } } },
    });
    res.json({ booking });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid status payload", err.issues));
    next(err);
  }
}
