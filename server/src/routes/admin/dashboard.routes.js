import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import { getDashboardStats, getNeedsAttention } from "../../controllers/admin/dashboard.controller.js";

const router = Router();
router.use(requireAdmin);

router.get("/", getDashboardStats);
router.get("/needs-attention", getNeedsAttention);

export default router;
