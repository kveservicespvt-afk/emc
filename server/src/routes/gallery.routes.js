import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/featured", async (_req, res, next) => {
  try {
    const reports = await prisma.serviceReport.findMany({
      where: { featuredOnHomepage: true, beforePhotoUrl: { not: null }, afterPhotoUrl: { not: null } },
      select: { id: true, beforePhotoUrl: true, afterPhotoUrl: true },
      take: 10,
    });
    res.json({ photos: reports });
  } catch (err) {
    next(err);
  }
});

export default router;
