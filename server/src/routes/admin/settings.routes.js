import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import { updateSettings } from "../../controllers/admin/settings.controller.js";

const router = Router();
router.use(requireAdmin);

router.patch("/", updateSettings);

export default router;
