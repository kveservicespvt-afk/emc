import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest } from "../../lib/errors.js";

const schema = z.object({ contentJson: z.record(z.string(), z.any()) });

export async function upsertPageContent(req, res, next) {
  try {
    const { contentJson } = schema.parse(req.body);
    const page = await prisma.pageContent.upsert({
      where: { id: req.params.slug },
      update: { contentJson },
      create: { id: req.params.slug, contentJson },
    });
    res.json({ page });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid page content payload", err.issues));
    next(err);
  }
}
