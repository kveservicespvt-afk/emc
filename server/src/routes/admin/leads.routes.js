import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import * as leads from "../../controllers/admin/leads.controller.js";

const router = Router();
router.use(requireAdmin);

router.get("/", leads.listLeads);
router.post("/:id/view", leads.markLeadViewed);
router.patch("/:id", leads.updateLead);

export default router;
