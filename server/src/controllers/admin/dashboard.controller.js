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

// Powers the sidebar nav badges. Every count here is a live computed query, not
// a stored "unseen" flag — it naturally clears the moment an admin takes the
// corresponding action (assigns a technician, updates a lead's status, etc.),
// so there's nothing to keep in sync. Extended in a later pass with payment
// counts once the Payments screen exists.
export async function getBadgeCounts(_req, res, next) {
  try {
    const [unassignedBookings, newGeneralQueries, newCommercialQueries] = await Promise.all([
      prisma.booking.count({ where: { technicianId: null, status: { in: ["PENDING", "CONFIRMED"] } } }),
      prisma.lead.count({ where: { leadType: "GENERAL", status: "NEW" } }),
      prisma.lead.count({ where: { leadType: "COMMERCIAL_QUOTE", status: "NEW" } }),
    ]);
    res.json({ unassignedBookings, newGeneralQueries, newCommercialQueries });
  } catch (err) {
    next(err);
  }
}
