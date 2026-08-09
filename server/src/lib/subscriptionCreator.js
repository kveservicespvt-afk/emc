import { prisma } from "./prisma.js";
import { calculatePrice } from "./pricing.js";
import { generateFutureVisitDates } from "./scheduling.js";

// Creates an AMC Subscription, books the first visit, and auto-generates the
// rest of the year's visits per the plan's frequency — the one place this
// happens, shared by the customer-facing signup flow (subscriptions.controller.js)
// and the admin field-lead conversion flow, so an admin-converted subscription
// is never a bare row with no visit schedule.
//
// Accepts an optional `client` (a Prisma transaction client) so a caller that
// needs this composed with other writes in one atomic transaction — e.g. the
// field-lead conversion flow, which also finds-or-creates a User and a Site —
// can pass its own `tx` through instead of this opening a second, separate one.
export async function createSubscriptionWithSchedule({ userId, siteId, amcPlanId, firstVisitDate, slotStart, slotEnd }, client = prisma) {
  const site = await client.site.findUnique({ where: { id: siteId } });
  if (!site) throw new Error("Site not found");

  const amcPlan = await client.aMCPlan.findUnique({ where: { id: amcPlanId } });
  if (!amcPlan || !amcPlan.active) throw new Error("AMC plan not found");

  const priceAmount = calculatePrice({
    basePrice: amcPlan.basePrice,
    pricePerKw: amcPlan.pricePerKw,
    plantCapacityKw: site.plantCapacityKw,
  });

  const renewalDate = new Date(firstVisitDate);
  renewalDate.setFullYear(renewalDate.getFullYear() + 1);

  const run = async (tx) => {
    const subscription = await tx.subscription.create({
      data: { userId, siteId: site.id, amcPlanId: amcPlan.id, startDate: firstVisitDate, renewalDate },
    });

    const firstBooking = await tx.booking.create({
      data: {
        userId,
        siteId: site.id,
        amcPlanId: amcPlan.id,
        subscriptionId: subscription.id,
        scheduledDate: firstVisitDate,
        slotStart,
        slotEnd,
        plantCapacityKw: site.plantCapacityKw,
        priceAmount,
      },
    });

    const futureVisits = generateFutureVisitDates(firstVisitDate, amcPlan.frequencyPerYear, slotStart, slotEnd);

    if (futureVisits.length > 0) {
      await tx.booking.createMany({
        data: futureVisits.map((visit) => ({
          userId,
          siteId: site.id,
          amcPlanId: amcPlan.id,
          subscriptionId: subscription.id,
          scheduledDate: visit.scheduledDate,
          slotStart: visit.slotStart,
          slotEnd: visit.slotEnd,
          plantCapacityKw: site.plantCapacityKw,
          priceAmount,
        })),
      });
    }

    return { subscription, firstBooking, futureVisitCount: futureVisits.length };
  };

  // `client` is either the top-level Prisma client (has $transaction, so open
  // one here) or an already-open `tx` from a caller's own transaction (no
  // $transaction method — just run directly inside it).
  return typeof client.$transaction === "function" ? client.$transaction(run) : run(client);
}
