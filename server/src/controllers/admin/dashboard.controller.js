import { prisma } from "../../lib/prisma.js";

export async function getDashboardStats(_req, res, next) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const [bookingsToday, pendingAssignments, activeAmcSubs, liveCities, newLeads, totalBookings] =
      await Promise.all([
        prisma.booking.count({ where: { scheduledDate: { gte: startOfToday, lt: endOfToday } } }),
        prisma.booking.count({ where: { technicianId: null, status: { in: ["PENDING", "CONFIRMED"] } } }),
        prisma.subscription.count({ where: { status: "ACTIVE" } }),
        prisma.city.count({ where: { status: "LIVE" } }),
        prisma.lead.count({ where: { status: "NEW" } }),
        prisma.booking.count(),
      ]);

    res.json({ bookingsToday, pendingAssignments, activeAmcSubs, liveCities, newLeads, totalBookings });
  } catch (err) {
    next(err);
  }
}

// A payment stuck PENDING for >24h needs a human look (Payment rows only exist
// for attempted transactions, so PENDING/FAILED payment rows are true problems,
// not just "not paid yet").
function stalePendingPaymentWhere() {
  const stallThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return { OR: [{ status: "FAILED" }, { status: "PENDING", createdAt: { lt: stallThreshold } }] };
}

// Powers the sidebar nav badges. Bookings/General/Commercial Queries additionally
// require viewedByAdminAt: null — once an admin actually opens a record it drops
// off the badge even if still unactioned (per explicit ask), which is a stricter
// condition than "Needs Attention" below, so the two panels can disagree on
// purpose: the badge is about unread notifications, the dashboard panel is about
// outstanding work. Payments badge is untouched — no viewed-tracking requested for it.
export async function getBadgeCounts(_req, res, next) {
  try {
    const [unassignedBookings, newGeneralQueries, newCommercialQueries, paymentIssues] = await Promise.all([
      prisma.booking.count({ where: { technicianId: null, status: { in: ["PENDING", "CONFIRMED"] }, viewedByAdminAt: null } }),
      prisma.lead.count({ where: { leadType: "GENERAL", status: "NEW", viewedByAdminAt: null } }),
      prisma.lead.count({ where: { leadType: "COMMERCIAL_QUOTE", status: "NEW", viewedByAdminAt: null } }),
      prisma.payment.count({ where: stalePendingPaymentWhere() }),
    ]);
    res.json({ unassignedBookings, newGeneralQueries, newCommercialQueries, paymentIssues });
  } catch (err) {
    next(err);
  }
}

// Same conditions as the badges, but returns the actual rows (capped) so the
// Dashboard "Needs Attention" panel can link straight into each record.
export async function getNeedsAttention(_req, res, next) {
  try {
    const [unassignedBookings, newLeads, paymentIssues] = await Promise.all([
      prisma.booking.findMany({
        where: { technicianId: null, status: { in: ["PENDING", "CONFIRMED"] } },
        include: { user: true, service: true, amcPlan: true },
        orderBy: { scheduledDate: "asc" },
        take: 10,
      }),
      prisma.lead.findMany({
        where: { status: "NEW" },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.payment.findMany({
        where: stalePendingPaymentWhere(),
        include: { booking: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);
    res.json({ unassignedBookings, newLeads, paymentIssues });
  } catch (err) {
    next(err);
  }
}
