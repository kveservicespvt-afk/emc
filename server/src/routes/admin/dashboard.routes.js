import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import { getDashboardStats } from "../../controllers/admin/dashboard.controller.js";

const router = Router();
router.use(requireAdmin);

router.get("/", getDashboardStats);

export default router;
