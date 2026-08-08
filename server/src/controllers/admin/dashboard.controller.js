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
