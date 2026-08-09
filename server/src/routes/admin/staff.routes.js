import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import { listStaff } from "../../controllers/admin/staff.controller.js";

const router = Router();
router.use(requireAdmin);

router.get("/", listStaff);

export default router;
