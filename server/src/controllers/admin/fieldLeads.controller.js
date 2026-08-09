import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { toCsv, parseCsv } from "../../lib/csv.js";
import { createSubscriptionWithSchedule } from "../../lib/subscriptionCreator.js";

const FIELD_LEAD_STATUSES = [
  "NOT_CALLED",
  "CALLED_NO_ANSWER",
  "CALLED_INTERESTED",
  "CALLED_NOT_INTERESTED",
  "FOLLOWUP_SCHEDULED",
  "CONVERTED",
  "LOST",
];
const SORTABLE_FIELDS = ["lastCallDate", "createdAt", "plantCapacityKw", "nextFollowupDate"];

function buildWhere(query) {
  const { view = "pending", callStatus, assignedToId, city, dateField, from, to } = query;
  const where = {};

  if (callStatus) where.callStatus = callStatus;
  else if (view === "pending") where.callStatus = { notIn: ["CONVERTED", "LOST"] };
  else if (view === "converted") where.callStatus = "CONVERTED";
  // view === "all" -> no callStatus filter

  if (assignedToId) where.assignedToId = assignedToId === "unassigned" ? null : assignedToId;
  if (city) where.city = { equals: city, mode: "insensitive" };
  if (from || to) {
    const field = dateField === "lastCall" ? "lastCallDate" : "createdAt";
    where[field] = {};
    if (from) where[field].gte = new Date(from);
    if (to) where[field].lte = new Date(to);
  }
  return where;
}

export async function listFieldLeads(req, res, next) {
  try {
    const { sortBy = "createdAt", sortDir = "desc" } = req.query;
    const orderBy = { [SORTABLE_FIELDS.includes(sortBy) ? sortBy : "createdAt"]: sortDir === "asc" ? "asc" : "desc" };

    const fieldLeads = await prisma.fieldLead.findMany({
      where: buildWhere(req.query),
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy,
    });
    res.json({ fieldLeads });
  } catch (err) {
    next(err);
  }
}

export async function getFieldLead(req, res, next) {
  try {
    const fieldLead = await prisma.fieldLead.findUnique({
      where: { id: req.params.id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        convertedSubscription: { include: { amcPlan: true, site: true } },
        callLogs: { orderBy: { createdAt: "desc" }, include: { calledBy: { select: { id: true, name: true } } } },
      },
    });
    if (!fieldLead) return next(notFound("Field lead not found"));
    res.json({ fieldLead });
  } catch (err) {
    next(err);
  }
}

const createFieldLeadSchema = z.object({
  houseNumber: z.string().optional(),
  customerName: z.string().min(2),
  phone: z.string().min(6),
  address: z.string().optional(),
  city: z.string().optional(),
  plantCapacityKw: z.coerce.number().positive().optional(),
  numberOfPanels: z.coerce.number().int().positive().optional(),
  source: z.string().optional(),
  assignedToId: z.string().optional(),
});

export async function createFieldLead(req, res, next) {
  try {
    const data = createFieldLeadSchema.parse(req.body);

    const existing = await prisma.fieldLead.findUnique({ where: { phone: data.phone } });
    if (existing) return next(badRequest(`A field lead with phone ${data.phone} already exists`));

    const fieldLead = await prisma.fieldLead.create({ data });
    res.status(201).json({ fieldLead });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid field lead payload", err.issues));
    if (err.code === "P2002") return next(badRequest("A field lead with this phone already exists"));
    next(err);
  }
}

const updateFieldLeadSchema = z.object({ assignedToId: z.string().nullable().optional() });

export async function updateFieldLead(req, res, next) {
  try {
    const data = updateFieldLeadSchema.parse(req.body);
    const existing = await prisma.fieldLead.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(notFound("Field lead not found"));

    const fieldLead = await prisma.fieldLead.update({ where: { id: req.params.id }, data });
    res.json({ fieldLead });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid update payload", err.issues));
    next(err);
  }
}

export async function exportFieldLeads(req, res, next) {
  try {
    const fieldLeads = await prisma.fieldLead.findMany({
      where: buildWhere(req.query),
      include: { assignedTo: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const csv = toCsv(
      [
        { label: "House Number", value: (f) => f.houseNumber },
        { label: "Customer Name", value: (f) => f.customerName },
        { label: "Phone", value: (f) => f.phone },
        { label: "Address", value: (f) => f.address },
        { label: "City", value: (f) => f.city },
        { label: "Plant Capacity (kW)", value: (f) => f.plantCapacityKw },
        { label: "Number of Panels", value: (f) => f.numberOfPanels },
        { label: "Call Status", value: (f) => f.callStatus },
        { label: "Last Call Date", value: (f) => f.lastCallDate?.toISOString().slice(0, 10) },
        { label: "Next Follow-up Date", value: (f) => f.nextFollowupDate?.toISOString().slice(0, 10) },
        { label: "Assigned To", value: (f) => f.assignedTo?.name },
        { label: "Created", value: (f) => f.createdAt.toISOString().slice(0, 10) },
      ],
      fieldLeads
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="field-leads-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

const SAMPLE_FIELD_LEAD_ROW = {
  house_number: "12-A",
  customer_name: "Suresh Yadav",
  phone: "+919876500001",
  address: "Near Water Tank, Sector 3",
  city: "Hisar",
  plant_capacity_kw: "5",
  number_of_panels: "12",
};

export function getSampleFieldLeadCsv(_req, res) {
  const csv = toCsv(
    Object.keys(SAMPLE_FIELD_LEAD_ROW).map((key) => ({ label: key, value: (r) => r[key] })),
    [SAMPLE_FIELD_LEAD_ROW]
  );
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="field-leads-sample.csv"');
  res.send(csv);
}

const importRowSchema = z.object({
  house_number: z.string().optional(),
  customer_name: z.string({ required_error: "customer_name is required" }).min(2, "customer_name is required"),
  phone: z.string({ required_error: "phone is required" }).min(6, "phone is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  plant_capacity_kw: z.coerce.number().positive().optional(),
  number_of_panels: z.coerce.number().int().positive().optional(),
});

export async function importFieldLeads(req, res, next) {
  try {
    if (!req.file) return next(badRequest("No CSV file uploaded"));
    const rows = parseCsv(req.file.buffer.toString("utf8"));
    if (rows.length === 0) return next(badRequest("The CSV file has no data rows"));

    let created = 0;
    const skipped = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2;
      const normalized = Object.fromEntries(
        Object.entries(rows[i]).map(([k, v]) => [k.trim().toLowerCase().replace(/\s+/g, "_"), v || undefined])
      );

      const parsed = importRowSchema.safeParse(normalized);
      if (!parsed.success) {
        skipped.push({ row: rowNum, reason: parsed.error.issues.map((issue) => issue.message).join("; ") });
        continue;
      }
      const data = parsed.data;

      const existing = await prisma.fieldLead.findUnique({ where: { phone: data.phone } });
      if (existing) {
        skipped.push({ row: rowNum, reason: `Phone ${data.phone} already exists` });
        continue;
      }

      try {
        await prisma.fieldLead.create({
          data: {
            houseNumber: data.house_number,
            customerName: data.customer_name,
            phone: data.phone,
            address: data.address,
            city: data.city,
            plantCapacityKw: data.plant_capacity_kw,
            numberOfPanels: data.number_of_panels,
            source: "bulk_import",
          },
        });
        created++;
      } catch (err) {
        skipped.push({ row: rowNum, reason: err.code === "P2002" ? "Duplicate phone" : "Could not create this row" });
      }
    }

    res.json({ created, skipped });
  } catch (err) {
    next(err);
  }
}

const callLogSchema = z.object({
  remark: z.string().max(2000).optional(),
  outcome: z.enum(FIELD_LEAD_STATUSES),
  nextFollowupDate: z.coerce.date().optional(),
});

export async function logCall(req, res, next) {
  try {
    const data = callLogSchema.parse(req.body);
    const existing = await prisma.fieldLead.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(notFound("Field lead not found"));

    const [callLog, fieldLead] = await prisma.$transaction([
      prisma.fieldLeadCallLog.create({
        data: { fieldLeadId: existing.id, calledById: req.user.id, remark: data.remark, outcome: data.outcome },
        include: { calledBy: { select: { id: true, name: true } } },
      }),
      prisma.fieldLead.update({
        where: { id: existing.id },
        data: {
          callStatus: data.outcome,
          lastCallDate: new Date(),
          ...(data.nextFollowupDate ? { nextFollowupDate: data.nextFollowupDate } : {}),
        },
      }),
    ]);

    res.status(201).json({ callLog, fieldLead });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid call log payload", err.issues));
    next(err);
  }
}

const convertSchema = z.object({
  amcPlanId: z.string().min(1),
  startDate: z.coerce.date(),
});

export async function convertFieldLead(req, res, next) {
  try {
    const data = convertSchema.parse(req.body);
    const existing = await prisma.fieldLead.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(notFound("Field lead not found"));
    if (existing.convertedSubscriptionId) return next(badRequest("This field lead has already been converted"));
    if (!existing.plantCapacityKw) return next(badRequest("This field lead has no plant capacity on file — required to create a site"));

    const result = await prisma.$transaction(async (tx) => {
      let customer = await tx.user.findUnique({ where: { phone: existing.phone } });
      if (!customer) {
        customer = await tx.user.create({ data: { name: existing.customerName, phone: existing.phone, role: "CUSTOMER" } });
      }

      const site = await tx.site.create({
        data: {
          userId: customer.id,
          label: existing.houseNumber ? `House ${existing.houseNumber}` : "Primary Site",
          addressJson: { line1: existing.address ?? "", city: existing.city ?? "", state: "", pincode: "" },
          plantCapacityKw: existing.plantCapacityKw,
        },
      });

      const { subscription } = await createSubscriptionWithSchedule(
        { userId: customer.id, siteId: site.id, amcPlanId: data.amcPlanId, firstVisitDate: data.startDate, slotStart: "06:00", slotEnd: "09:00" },
        tx
      );

      const fieldLead = await tx.fieldLead.update({
        where: { id: existing.id },
        data: { convertedSubscriptionId: subscription.id, callStatus: "CONVERTED" },
      });

      return { fieldLead, subscription, customer, site };
    });

    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid conversion payload", err.issues));
    if (err instanceof Error && err.message === "AMC plan not found") return next(notFound("AMC plan not found"));
    next(err);
  }
}

export async function getFieldLeadStats(_req, res, next) {
  try {
    const now = new Date();
    const [total, converted, lost, overdueFollowups] = await Promise.all([
      prisma.fieldLead.count(),
      prisma.fieldLead.count({ where: { callStatus: "CONVERTED" } }),
      prisma.fieldLead.count({ where: { callStatus: "LOST" } }),
      prisma.fieldLead.count({ where: { nextFollowupDate: { lt: now }, callStatus: { notIn: ["CONVERTED", "LOST"] } } }),
    ]);
    const pending = total - converted - lost;
    const conversionRate = total > 0 ? converted / total : 0;
    res.json({ total, pending, converted, lost, conversionRate, overdueFollowups });
  } catch (err) {
    next(err);
  }
}
