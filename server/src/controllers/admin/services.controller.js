import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound, conflict } from "../../lib/errors.js";

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  basePrice: z.coerce.number().nonnegative(),
  pricePerKw: z.coerce.number().nonnegative().default(0),
  category: z.enum(["CLEANING", "AMC", "AUDIT", "RESTORATION"]),
  featuresJson: z.array(z.string()).optional(),
  active: z.coerce.boolean().optional(),
});

export async function listServices(_req, res, next) {
  try {
    const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
    res.json({ services });
  } catch (err) {
    next(err);
  }
}

export async function createService(req, res, next) {
  try {
    const data = serviceSchema.parse(req.body);
    const service = await prisma.service.create({ data });
    res.status(201).json({ service });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid service payload", err.issues));
    next(err);
  }
}

export async function updateService(req, res, next) {
  try {
    const data = serviceSchema.partial().parse(req.body);
    const service = await prisma.service.update({ where: { id: req.params.id }, data });
    res.json({ service });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid service payload", err.issues));
    if (err.code === "P2025") return next(notFound("Service not found"));
    next(err);
  }
}

export async function deleteService(req, res, next) {
  try {
    const bookingCount = await prisma.booking.count({ where: { serviceId: req.params.id } });
    if (bookingCount > 0) {
      return next(conflict("This service has existing bookings — deactivate it instead of deleting."));
    }
    await prisma.service.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") return next(notFound("Service not found"));
    next(err);
  }
}
