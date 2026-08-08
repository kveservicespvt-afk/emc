import { prisma } from "../../lib/prisma.js";
import { toCsv } from "../../lib/csv.js";

// Named "analytics" (not "reports") to avoid colliding with the existing
// admin/reports.routes.js, which is the unrelated Service Report photo/PR-ratio
// editor screen.

function resolveRange(query) {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

function bucketKey(date, granularity) {
  const d = new Date(date);
  if (granularity === "day") return d.toISOString().slice(0, 10);
  return d.toISOString().slice(0, 7); // YYYY-MM
}

function sendMaybeCsv(req, res, { columns, rows, jsonBody }) {
  if (req.query.format === "csv") {
    const csv = toCsv(columns, rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="report-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(csv);
  }
  res.json(jsonBody);
}

export async function getRevenueReport(req, res, next) {
  try {
    const { from, to } = resolveRange(req.query);
    const granularity = (to - from) / (24 * 60 * 60 * 1000) <= 31 ? "day" : "month";

    const payments = await prisma.payment.findMany({
      where: { status: "SUCCESSFUL", createdAt: { gte: from, lte: to } },
      include: { booking: { select: { amcPlanId: true } } },
      orderBy: { createdAt: "asc" },
    });

    const buckets = new Map();
    let serviceTotal = 0;
    let amcTotal = 0;
    for (const p of payments) {
      const key = bucketKey(p.createdAt, granularity);
      const isAmc = !!p.booking?.amcPlanId;
      const entry = buckets.get(key) ?? { period: key, serviceRevenue: 0, amcRevenue: 0 };
      if (isAmc) { entry.amcRevenue += p.amount; amcTotal += p.amount; }
      else { entry.serviceRevenue += p.amount; serviceTotal += p.amount; }
      buckets.set(key, entry);
    }
    const rows = [...buckets.values()]
      .map((r) => ({ ...r, total: r.serviceRevenue + r.amcRevenue }))
      .sort((a, b) => a.period.localeCompare(b.period));

    sendMaybeCsv(req, res, {
      columns: [
        { label: "Period", value: (r) => r.period },
        { label: "Service Revenue", value: (r) => r.serviceRevenue },
        { label: "AMC Revenue", value: (r) => r.amcRevenue },
        { label: "Total", value: (r) => r.total },
      ],
      rows,
      jsonBody: { granularity, buckets: rows, totals: { serviceTotal, amcTotal, total: serviceTotal + amcTotal } },
    });
  } catch (err) {
    next(err);
  }
}

export async function getBookingsReport(req, res, next) {
  try {
    const { from, to } = resolveRange(req.query);
    const bookings = await prisma.booking.findMany({
      where: { scheduledDate: { gte: from, lte: to } },
      include: { site: true, service: true },
    });

    const byStatus = new Map();
    const byCity = new Map();
    const byService = new Map();
    for (const b of bookings) {
      byStatus.set(b.status, (byStatus.get(b.status) ?? 0) + 1);
      const city = b.site?.addressJson?.city ?? "Unknown";
      byCity.set(city, (byCity.get(city) ?? 0) + 1);
      const service = b.service?.name ?? "AMC Visit";
      byService.set(service, (byService.get(service) ?? 0) + 1);
    }

    const toRows = (map, labelKey) => [...map.entries()].map(([k, count]) => ({ [labelKey]: k, count }));
    const rows = toRows(byStatus, "status");

    sendMaybeCsv(req, res, {
      columns: [
        { label: "Status", value: (r) => r.status },
        { label: "Count", value: (r) => r.count },
      ],
      rows,
      jsonBody: {
        total: bookings.length,
        byStatus: rows,
        byCity: toRows(byCity, "city"),
        byService: toRows(byService, "service"),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getCustomersReport(req, res, next) {
  try {
    const { from, to } = resolveRange(req.query);
    const granularity = (to - from) / (24 * 60 * 60 * 1000) <= 31 ? "day" : "month";

    const newCustomers = await prisma.user.findMany({
      where: { role: "CUSTOMER", createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
    });
    const buckets = new Map();
    for (const c of newCustomers) {
      const key = bucketKey(c.createdAt, granularity);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    const newCustomersOverTime = [...buckets.entries()]
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const customersWithBookings = await prisma.user.findMany({
      where: { role: "CUSTOMER", bookings: { some: {} } },
      select: { id: true, _count: { select: { bookings: true, subscriptions: true } } },
    });
    const repeat = customersWithBookings.filter((c) => c._count.bookings > 1).length;
    const oneTime = customersWithBookings.filter((c) => c._count.bookings === 1).length;
    const amcSubscribers = customersWithBookings.filter((c) => c._count.subscriptions > 0).length;
    const oneTimeOnly = customersWithBookings.length - amcSubscribers;

    sendMaybeCsv(req, res, {
      columns: [
        { label: "Period", value: (r) => r.period },
        { label: "New Customers", value: (r) => r.count },
      ],
      rows: newCustomersOverTime,
      jsonBody: {
        granularity,
        newCustomersOverTime,
        repeatVsOneTime: { repeat, oneTime },
        amcVsOneTimeSubscribers: { amcSubscribers, oneTimeOnly },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function leadTypeStats(leadType, from, to) {
  const [received, converted, contactedLeads] = await Promise.all([
    prisma.lead.count({ where: { leadType, createdAt: { gte: from, lte: to } } }),
    prisma.lead.count({ where: { leadType, status: "CONVERTED", createdAt: { gte: from, lte: to } } }),
    prisma.lead.findMany({
      where: { leadType, createdAt: { gte: from, lte: to }, contactedAt: { not: null } },
      select: { createdAt: true, contactedAt: true },
    }),
  ]);
  const avgTimeToContactHours = contactedLeads.length
    ? contactedLeads.reduce((sum, l) => sum + (l.contactedAt - l.createdAt), 0) / contactedLeads.length / (1000 * 60 * 60)
    : null;
  return {
    received,
    converted,
    conversionRate: received ? converted / received : 0,
    avgTimeToContactHours,
  };
}

export async function getLeadsReport(req, res, next) {
  try {
    const { from, to } = resolveRange(req.query);
    const [general, commercial] = await Promise.all([
      leadTypeStats("GENERAL", from, to),
      leadTypeStats("COMMERCIAL_QUOTE", from, to),
    ]);

    const rows = [
      { type: "General", ...general },
      { type: "Commercial", ...commercial },
    ];

    sendMaybeCsv(req, res, {
      columns: [
        { label: "Type", value: (r) => r.type },
        { label: "Received", value: (r) => r.received },
        { label: "Converted", value: (r) => r.converted },
        { label: "Conversion Rate", value: (r) => (r.conversionRate * 100).toFixed(1) + "%" },
        { label: "Avg Time to Contact (hrs)", value: (r) => (r.avgTimeToContactHours ?? "").toString().slice(0, 5) },
      ],
      rows,
      jsonBody: { general, commercial },
    });
  } catch (err) {
    next(err);
  }
}

export async function getTechniciansReport(req, res, next) {
  try {
    const { from, to } = resolveRange(req.query);
    const technicians = await prisma.technician.findMany({
      include: {
        user: { select: { name: true } },
        bookings: {
          where: { scheduledDate: { gte: from, lte: to } },
          select: { status: true, serviceReport: { select: { defectsJson: true } } },
        },
      },
    });

    const rows = technicians.map((t) => {
      const completedBookings = t.bookings.filter((b) => b.status === "COMPLETED").length;
      const defectCount = t.bookings.reduce((sum, b) => sum + (Array.isArray(b.serviceReport?.defectsJson) ? b.serviceReport.defectsJson.length : 0), 0);
      return { id: t.id, name: t.user.name, completedBookings, ratingAvg: t.ratingAvg, defectCount };
    });

    sendMaybeCsv(req, res, {
      columns: [
        { label: "Technician", value: (r) => r.name },
        { label: "Completed Bookings", value: (r) => r.completedBookings },
        { label: "Rating Avg", value: (r) => r.ratingAvg },
        { label: "Defects Flagged", value: (r) => r.defectCount },
      ],
      rows,
      jsonBody: { technicians: rows },
    });
  } catch (err) {
    next(err);
  }
}
