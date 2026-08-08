import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound } from "../../lib/errors.js";

const citySchema = z.object({
  name: z.string().min(2),
  state: z.string().min(2),
  status: z.enum(["LIVE", "UPCOMING"]).optional(),
  dustZone: z.enum(["HIGH", "MODERATE", "LOW"]).optional(),
});

export async function listCitiesAdmin(_req, res, next) {
  try {
    const cities = await prisma.city.findMany({ orderBy: [{ status: "asc" }, { name: "asc" }] });
    res.json({ cities });
  } catch (err) {
    next(err);
  }
}

export async function createCity(req, res, next) {
  try {
    const data = citySchema.parse(req.body);
    const city = await prisma.city.create({ data });
    res.status(201).json({ city });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid city payload", err.issues));
    if (err.code === "P2002") return next(badRequest("This city already exists for that state"));
    next(err);
  }
}

export async function updateCity(req, res, next) {
  try {
    const data = citySchema.partial().parse(req.body);
    const city = await prisma.city.update({ where: { id: req.params.id }, data });
    res.json({ city });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid city payload", err.issues));
    if (err.code === "P2025") return next(notFound("City not found"));
    next(err);
  }
}

export async function deleteCity(req, res, next) {
  try {
    await prisma.city.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") return next(notFound("City not found"));
    next(err);
  }
}
