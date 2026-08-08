import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      orderBy: { basePrice: "asc" },
    });
    res.json({ services });
  } catch (err) {
    next(err);
  }
});

export default router;
