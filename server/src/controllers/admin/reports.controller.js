import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound } from "../../lib/errors.js";

const reportSchema = z.object({
  dcIsolationConfirmed: z.coerce.boolean().optional(),
  cleaningMethod: z.enum(["DRY", "WET", "ROBOTIC"]).optional(),
  waterTds: z.coerce.number().optional(),
  waterPh: z.coerce.number().optional(),
  areaCleanedSqm: z.coerce.number().optional(),
  waterUsedL: z.coerce.number().optional(),
  prePrRatio: z.coerce.number().optional(),
  postPrRatio: z.coerce.number().optional(),
  improvementPct: z.coerce.number().optional(),
  defectsJson: z.array(z.object({ area: z.string(), severity: z.enum(["LOW", "MEDIUM", "HIGH"]), remarks: z.string().optional() })).optional(),
  electricalChecksJson: z.record(z.string(), z.string()).optional(),
  vegetationStructuralJson: z.record(z.string(), z.string()).optional(),
  featuredOnHomepage: z.coerce.boolean().optional(),
  publish: z.coerce.boolean().optional(), // sets adminApprovedAt when true
});

export async function upsertReport(req, res, next) {
  try {
    const bookingId = req.params.id;
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return next(notFound("Booking not found"));

    const { publish, ...data } = reportSchema.parse(req.body);

    const report = await prisma.serviceReport.upsert({
      where: { bookingId },
      update: { ...data, ...(publish ? { adminApprovedAt: new Date() } : {}) },
      create: { bookingId, ...data, ...(publish ? { adminApprovedAt: new Date() } : {}) },
    });

    res.json({ report });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid report payload", err.issues));
    next(err);
  }
}

export async function uploadReportPhotos(req, res, next) {
  try {
    const bookingId = req.params.id;
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return next(notFound("Booking not found"));

    const updates = {};
    if (req.files?.before?.[0]) {
      updates.beforePhotoUrl = `/uploads/reports/${bookingId}/${req.files.before[0].filename}`;
    }
    if (req.files?.after?.[0]) {
      updates.afterPhotoUrl = `/uploads/reports/${bookingId}/${req.files.after[0].filename}`;
    }
    if (Object.keys(updates).length === 0) {
      return next(badRequest("No photo files were uploaded"));
    }

    const report = await prisma.serviceReport.upsert({
      where: { bookingId },
      update: updates,
      create: { bookingId, ...updates },
    });

    res.json({ report });
  } catch (err) {
    next(err);
  }
}
