import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import { getBadgeCounts } from "../../controllers/admin/dashboard.controller.js";

const router = Router();
router.use(requireAdmin);

router.get("/", getBadgeCounts);

export default router;
