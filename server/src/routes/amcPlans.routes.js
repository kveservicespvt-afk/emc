import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    // Ordered by commitment level (1x -> 4x -> 12x/year), not price — AMC per-visit
    // price actually decreases with higher frequency, which would otherwise put
    // Premium first and misalign the client's "most popular = last card" styling.
    const amcPlans = await prisma.aMCPlan.findMany({
      where: { active: true },
      orderBy: { frequencyPerYear: "asc" },
    });
    res.json({ amcPlans });
  } catch (err) {
    next(err);
  }
});

export default router;
