import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound } from "../../lib/errors.js";

export async function listLeads(req, res, next) {
  try {
    const { leadType, status, search } = req.query;
    const where = {};
    if (leadType) where.leadType = leadType;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ leads });
  } catch (err) {
    next(err);
  }
}

const updateSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CONVERTED", "LOST"]).optional(),
  assignedToId: z.string().nullable().optional(),
});

export async function updateLead(req, res, next) {
  try {
    const data = updateSchema.parse(req.body);
    const lead = await prisma.lead.update({ where: { id: req.params.id }, data });
    res.json({ lead });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid lead update payload", err.issues));
    if (err.code === "P2025") return next(notFound("Lead not found"));
    next(err);
  }
}
