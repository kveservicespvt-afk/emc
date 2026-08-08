import { Router } from "express";
import { z } from "zod";
import { estimateSavings } from "../lib/roiCalculator.js";
import { badRequest } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const schema = z.object({
  plantCapacityKw: z.coerce.number().positive(),
  avgMonthlyBill: z.coerce.number().nonnegative(),
  dustZone: z.enum(["HIGH", "MODERATE", "LOW"]),
});

router.post("/", async (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    const lossPctByZone = settings
      ? { HIGH: settings.roiHighZoneLossPct, MODERATE: settings.roiModerateZoneLossPct, LOW: settings.roiLowZoneLossPct }
      : undefined;
    res.json(estimateSavings(input, lossPctByZone));
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid ROI calculator input", err.issues));
    next(err);
  }
});

export default router;
