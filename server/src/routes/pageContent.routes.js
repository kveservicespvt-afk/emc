import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/:slug", async (req, res, next) => {
  try {
    const page = await prisma.pageContent.findUnique({ where: { id: req.params.slug } });
    res.json({ page });
  } catch (err) {
    next(err);
  }
});

export default router;
