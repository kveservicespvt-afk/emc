import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest } from "../../lib/errors.js";

const settingsSchema = z.object({
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(6).optional(),
  whatsappNumber: z.string().min(6).optional(),
  addressLine: z.string().min(4).optional(),
  socialLinksJson: z.record(z.string(), z.string()).optional(),
  roiHighZoneLossPct: z.coerce.number().min(0).max(1).optional(),
  roiModerateZoneLossPct: z.coerce.number().min(0).max(1).optional(),
  roiLowZoneLossPct: z.coerce.number().min(0).max(1).optional(),
});

export async function updateSettings(req, res, next) {
  try {
    const data = settingsSchema.parse(req.body);
    const settings = await prisma.siteSettings.update({ where: { id: "singleton" }, data });
    res.json({ settings });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid settings payload", err.issues));
    next(err);
  }
}
