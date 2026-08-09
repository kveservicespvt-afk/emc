import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { badRequest, notFound } from "../lib/errors.js";
import { assertSlotAllowed } from "../lib/slotValidator.js";
import { createSubscriptionWithSchedule } from "../lib/subscriptionCreator.js";

const createSubscriptionSchema = z.object({
  siteId: z.string().min(1),
  amcPlanId: z.string().min(1),
  firstVisitDate: z.coerce.date(),
  slotStart: z.string().regex(/^\d{2}:\d{2}$/),
  slotEnd: z.string().regex(/^\d{2}:\d{2}$/),
});

// Creates an AMC Subscription, books the first visit, and auto-generates the rest
// of the year's visits per the plan's frequency (Section 5.6). Each visit is priced
// individually from the plan's rate card — ASSUMPTION: AMCPlan.basePrice/pricePerKw
// is a per-visit rate, not a single annual lump sum (flagged for client confirmation).
export async function createSubscription(req, res, next) {
  try {
    const data = createSubscriptionSchema.parse(req.body);
    assertSlotAllowed(data.slotStart, data.slotEnd);

    const site = await prisma.site.findUnique({ where: { id: data.siteId } });
    if (!site || site.userId !== req.user.id) return next(notFound("Site not found"));

    const result = await createSubscriptionWithSchedule({
      userId: req.user.id,
      siteId: data.siteId,
      amcPlanId: data.amcPlanId,
      firstVisitDate: data.firstVisitDate,
      slotStart: data.slotStart,
      slotEnd: data.slotEnd,
    });

    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid subscription payload", err.issues));
    if (err instanceof Error && err.message.includes("blocked")) return next(badRequest(err.message));
    if (err instanceof Error && err.message === "AMC plan not found") return next(notFound("AMC plan not found"));
    next(err);
  }
}

export async function listMySubscriptions(req, res, next) {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.user.id },
      include: { amcPlan: true, site: true, bookings: { orderBy: { scheduledDate: "asc" } } },
      orderBy: { startDate: "desc" },
    });
    res.json({ subscriptions });
  } catch (err) {
    next(err);
  }
}
