import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import { upsertPageContent } from "../../controllers/admin/pageContent.controller.js";

const router = Router();
router.use(requireAdmin);

router.patch("/:slug", upsertPageContent);

export default router;
