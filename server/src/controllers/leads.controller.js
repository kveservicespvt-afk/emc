import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { badRequest } from "../lib/errors.js";

const leadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10).max(15),
  city: z.string().optional(),
  plantCapacityKw: z.coerce.number().positive().optional(),
  message: z.string().optional(),
  source: z.string().optional(),
  leadType: z.enum(["GENERAL", "SCHEME_ASSISTANCE", "REPAIR_REQUEST", "WARRANTY_WAITLIST", "COMMERCIAL_QUOTE"]).optional(),
});

export async function createLead(req, res, next) {
  try {
    const data = leadSchema.parse(req.body);
    const lead = await prisma.lead.create({
      data: { ...data, source: data.source ?? "website" },
    });
    res.status(201).json({ lead });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid lead payload", err.issues));
    next(err);
  }
}
