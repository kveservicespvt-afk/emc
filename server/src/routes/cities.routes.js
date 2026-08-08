import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const where = req.query.status ? { status: req.query.status } : {};
    const cities = await prisma.city.findMany({ where, orderBy: { name: "asc" } });
    res.json({ cities });
  } catch (err) {
    next(err);
  }
});

export default router;
