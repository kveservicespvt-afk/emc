import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound } from "../../lib/errors.js";

export async function listCustomers(req, res, next) {
  try {
    const { search, city, amcStatus } = req.query;

    const where = { role: "CUSTOMER" };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (city) {
      where.sites = { some: { addressJson: { path: ["city"], equals: city } } };
    }
    if (amcStatus === "active") {
      where.subscriptions = { some: { status: "ACTIVE" } };
    } else if (amcStatus === "none") {
      where.subscriptions = { none: { status: "ACTIVE" } };
    }

    const customers = await prisma.user.findMany({
      where,
      include: {
        sites: true,
        bookings: { orderBy: { scheduledDate: "desc" }, take: 1 },
        subscriptions: { where: { status: "ACTIVE" } },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      city: c.sites[0]?.addressJson?.city ?? null,
      bookingCount: c._count.bookings,
      hasActiveAmc: c.subscriptions.length > 0,
      joinedAt: c.createdAt,
      lastBookingDate: c.bookings[0]?.scheduledDate ?? null,
    }));

    res.json({ customers: result });
  } catch (err) {
    next(err);
  }
}

export async function getCustomer(req, res, next) {
  try {
    const customer = await prisma.user.findFirst({
      where: { id: req.params.id, role: "CUSTOMER" },
      include: {
        sites: true,
        bookings: {
          orderBy: { scheduledDate: "desc" },
          include: {
            service: true,
            amcPlan: true,
            technician: { include: { user: true } },
            serviceReport: true,
            payments: true,
            review: true,
          },
        },
        subscriptions: {
          orderBy: { startDate: "desc" },
          include: { amcPlan: true, bookings: { orderBy: { scheduledDate: "asc" } } },
        },
      },
    });
    if (!customer) return next(notFound("Customer not found"));

    const leads = customer.phone
      ? await prisma.lead.findMany({ where: { phone: customer.phone }, orderBy: { createdAt: "desc" } })
      : [];

    const { passwordHash, otpCodeHash, otpExpiresAt, ...safeCustomer } = customer;
    res.json({ customer: safeCustomer, leads });
  } catch (err) {
    next(err);
  }
}

const notesSchema = z.object({ internalNotes: z.string().max(5000) });

export async function updateCustomerNotes(req, res, next) {
  try {
    const { internalNotes } = notesSchema.parse(req.body);
    const existing = await prisma.user.findFirst({ where: { id: req.params.id, role: "CUSTOMER" } });
    if (!existing) return next(notFound("Customer not found"));

    const customer = await prisma.user.update({
      where: { id: req.params.id },
      data: { internalNotes },
      select: { id: true, internalNotes: true },
    });
    res.json({ customer });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid notes payload", err.issues));
    next(err);
  }
}
