import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound, conflict } from "../../lib/errors.js";

const amcPlanSchema = z.object({
  name: z.string().min(2),
  frequencyPerYear: z.coerce.number().int().positive(),
  basePrice: z.coerce.number().nonnegative(),
  pricePerKw: z.coerce.number().nonnegative().default(0),
  includesJson: z.record(z.string(), z.string()).optional(),
  active: z.coerce.boolean().optional(),
});

export async function listAmcPlans(_req, res, next) {
  try {
    const amcPlans = await prisma.aMCPlan.findMany({ orderBy: { frequencyPerYear: "asc" } });
    res.json({ amcPlans });
  } catch (err) {
    next(err);
  }
}

export async function createAmcPlan(req, res, next) {
  try {
    const data = amcPlanSchema.parse(req.body);
    const amcPlan = await prisma.aMCPlan.create({ data });
    res.status(201).json({ amcPlan });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid AMC plan payload", err.issues));
    next(err);
  }
}

export async function updateAmcPlan(req, res, next) {
  try {
    const data = amcPlanSchema.partial().parse(req.body);
    const amcPlan = await prisma.aMCPlan.update({ where: { id: req.params.id }, data });
    res.json({ amcPlan });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid AMC plan payload", err.issues));
    if (err.code === "P2025") return next(notFound("AMC plan not found"));
    next(err);
  }
}

export async function deleteAmcPlan(req, res, next) {
  try {
    const bookingCount = await prisma.booking.count({ where: { amcPlanId: req.params.id } });
    const subCount = await prisma.subscription.count({ where: { amcPlanId: req.params.id } });
    if (bookingCount > 0 || subCount > 0) {
      return next(conflict("This AMC plan has existing bookings/subscriptions — deactivate it instead of deleting."));
    }
    await prisma.aMCPlan.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") return next(notFound("AMC plan not found"));
    next(err);
  }
}
