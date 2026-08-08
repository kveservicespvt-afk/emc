import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import * as services from "../../controllers/admin/services.controller.js";

const router = Router();
router.use(requireAdmin);

router.get("/", services.listServices);
router.post("/", services.createService);
router.patch("/:id", services.updateService);
router.delete("/:id", services.deleteService);

export default router;
