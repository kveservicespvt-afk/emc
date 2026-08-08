import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { badRequest, notFound, forbidden } from "../lib/errors.js";

const siteSchema = z.object({
  label: z.string().min(2),
  addressJson: z.object({
    line1: z.string().min(2),
    city: z.string().min(2),
    state: z.string().min(2),
    pincode: z.string().min(4),
  }),
  plantCapacityKw: z.coerce.number().positive(),
  mountType: z.enum(["ROOFTOP", "GROUND", "AGRI_KUSUM"]).default("ROOFTOP"),
});

export async function createSite(req, res, next) {
  try {
    const data = siteSchema.parse(req.body);

    // Only enforce "must be a live city" once cities are actually configured —
    // skips gracefully on a fresh DB with no City rows yet.
    const cityCount = await prisma.city.count();
    if (cityCount > 0) {
      const liveCity = await prisma.city.findFirst({
        where: { name: data.addressJson.city, status: "LIVE" },
      });
      if (!liveCity) {
        return next(badRequest(`${data.addressJson.city} isn't a serviceable city yet.`));
      }
    }

    const site = await prisma.site.create({ data: { ...data, userId: req.user.id } });
    res.status(201).json({ site });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid site payload", err.issues));
    next(err);
  }
}

export async function listMySites(req, res, next) {
  try {
    const sites = await prisma.site.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ sites });
  } catch (err) {
    next(err);
  }
}

export async function getSite(req, res, next) {
  try {
    const site = await prisma.site.findUnique({ where: { id: req.params.id } });
    if (!site) return next(notFound("Site not found"));
    if (site.userId !== req.user.id && req.user.role === "CUSTOMER") {
      return next(forbidden());
    }
    res.json({ site });
  } catch (err) {
    next(err);
  }
}
