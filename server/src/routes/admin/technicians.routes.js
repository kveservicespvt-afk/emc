import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import { listTechnicians } from "../../controllers/admin/technicians.controller.js";

const router = Router();
router.use(requireAdmin);

router.get("/", listTechnicians);

export default router;
