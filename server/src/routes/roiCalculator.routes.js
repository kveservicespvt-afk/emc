import { Router } from "express";
import { z } from "zod";
import { estimateSavings } from "../lib/roiCalculator.js";
import { badRequest } from "../lib/errors.js";

const router = Router();

const schema = z.object({
  plantCapacityKw: z.coerce.number().positive(),
  avgMonthlyBill: z.coerce.number().nonnegative(),
  dustZone: z.enum(["HIGH", "MODERATE", "LOW"]),
});

router.post("/", (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    res.json(estimateSavings(input));
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid ROI calculator input", err.issues));
    next(err);
  }
});

export default router;
