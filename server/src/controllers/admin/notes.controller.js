import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest } from "../../lib/errors.js";

const listSchema = z.object({
  entityType: z.enum(["BOOKING", "LEAD"]),
  entityId: z.string().min(1),
});

export async function listNotes(req, res, next) {
  try {
    const { entityType, entityId } = listSchema.parse(req.query);
    const notes = await prisma.adminNote.findMany({
      where: { entityType, entityId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ notes });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid query", err.issues));
    next(err);
  }
}

const createSchema = z.object({
  entityType: z.enum(["BOOKING", "LEAD"]),
  entityId: z.string().min(1),
  body: z.string().min(1).max(2000),
});

export async function createNote(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const note = await prisma.adminNote.create({
      data: { ...data, authorId: req.user.id },
      include: { author: { select: { id: true, name: true } } },
    });
    res.status(201).json({ note });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid note payload", err.issues));
    next(err);
  }
}
