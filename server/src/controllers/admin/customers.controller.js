import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { toCsv, parseCsv } from "../../lib/csv.js";

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

const createCustomerSchema = z
  .object({
    name: z.string().min(2),
    phone: z.string().min(6).optional(),
    email: z.string().email().optional(),
    city: z.string().optional(),
    address: z.string().optional(),
    plantCapacityKw: z.coerce.number().positive().optional(),
  })
  .refine((d) => d.phone || d.email, { message: "Provide at least a phone number or email", path: ["phone"] });

// A Site is only created when there's enough to make one meaningful (city +
// address + capacity) — e.g. a phone-booked customer with no address on file
// yet is still a valid customer record, just without a site until later.
function siteCreateData({ city, address, plantCapacityKw }) {
  if (!city || !address || !plantCapacityKw) return {};
  return { sites: { create: { label: "Primary Site", addressJson: { line1: address, city, state: "", pincode: "" }, plantCapacityKw } } };
}

export async function createCustomer(req, res, next) {
  try {
    const data = createCustomerSchema.parse(req.body);

    if (data.phone) {
      const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
      if (existing) return next(badRequest(`A customer with phone ${data.phone} already exists`));
    }
    if (data.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) return next(badRequest(`A customer with email ${data.email} already exists`));
    }

    const customer = await prisma.user.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        role: "CUSTOMER",
        ...siteCreateData(data),
      },
      include: { sites: true },
    });
    res.status(201).json({ customer });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid customer payload", err.issues));
    if (err.code === "P2002") return next(badRequest("A customer with this phone or email already exists"));
    next(err);
  }
}

export async function exportCustomers(_req, res, next) {
  try {
    const customers = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      include: { sites: true, _count: { select: { bookings: true } }, subscriptions: { where: { status: "ACTIVE" } } },
      orderBy: { createdAt: "desc" },
    });

    const csv = toCsv(
      [
        { label: "Name", value: (c) => c.name },
        { label: "Phone", value: (c) => c.phone },
        { label: "Email", value: (c) => c.email },
        { label: "City", value: (c) => c.sites[0]?.addressJson?.city },
        { label: "Bookings", value: (c) => c._count.bookings },
        { label: "AMC Active", value: (c) => (c.subscriptions.length > 0 ? "Yes" : "No") },
        { label: "Joined", value: (c) => c.createdAt.toISOString().slice(0, 10) },
      ],
      customers
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

const SAMPLE_CUSTOMER_ROW = {
  name: "Ramesh Kumar",
  phone: "+919876543210",
  email: "ramesh@example.com",
  city: "Hisar",
  address: "123 MG Road, Sector 14",
  plant_capacity_kw: "5",
};

export function getSampleCustomerCsv(_req, res) {
  const csv = toCsv(
    Object.keys(SAMPLE_CUSTOMER_ROW).map((key) => ({ label: key, value: (r) => r[key] })),
    [SAMPLE_CUSTOMER_ROW]
  );
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="customers-sample.csv"');
  res.send(csv);
}

const importRowSchema = z
  .object({
    name: z.string({ required_error: "name is required" }).min(2, "name is required"),
    phone: z.string().min(6).optional(),
    email: z.string().email("invalid email").optional(),
    city: z.string().optional(),
    address: z.string().optional(),
    plant_capacity_kw: z.coerce.number().positive().optional(),
  })
  .refine((d) => d.phone || d.email, { message: "phone or email is required" });

export async function importCustomers(req, res, next) {
  try {
    if (!req.file) return next(badRequest("No CSV file uploaded"));
    const rows = parseCsv(req.file.buffer.toString("utf8"));
    if (rows.length === 0) return next(badRequest("The CSV file has no data rows"));

    let created = 0;
    const skipped = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // header is row 1, data rows are 1-indexed from there
      const normalized = Object.fromEntries(
        Object.entries(rows[i]).map(([k, v]) => [k.trim().toLowerCase().replace(/\s+/g, "_"), v || undefined])
      );

      const parsed = importRowSchema.safeParse(normalized);
      if (!parsed.success) {
        skipped.push({ row: rowNum, reason: parsed.error.issues.map((issue) => issue.message).join("; ") });
        continue;
      }
      const data = parsed.data;

      if (data.phone) {
        const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
        if (existing) {
          skipped.push({ row: rowNum, reason: `Phone ${data.phone} already exists` });
          continue;
        }
      }

      try {
        await prisma.user.create({
          data: {
            name: data.name,
            phone: data.phone,
            email: data.email,
            role: "CUSTOMER",
            ...siteCreateData({ city: data.city, address: data.address, plantCapacityKw: data.plant_capacity_kw }),
          },
        });
        created++;
      } catch (err) {
        skipped.push({ row: rowNum, reason: err.code === "P2002" ? "Duplicate phone or email" : "Could not create this row" });
      }
    }

    res.json({ created, skipped });
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
