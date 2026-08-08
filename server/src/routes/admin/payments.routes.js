import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import * as payments from "../../controllers/admin/payments.controller.js";

const router = Router();
router.use(requireAdmin);

router.get("/", payments.listPayments);
router.get("/summary", payments.getSummary);
router.get("/export", payments.exportPayments);
router.post("/:bookingId/mark-paid", payments.markPaid);

export default router;
