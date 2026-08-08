import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import * as amcPlans from "../../controllers/admin/amcPlans.controller.js";

const router = Router();
router.use(requireAdmin);

router.get("/", amcPlans.listAmcPlans);
router.post("/", amcPlans.createAmcPlan);
router.patch("/:id", amcPlans.updateAmcPlan);
router.delete("/:id", amcPlans.deleteAmcPlan);

export default router;
