import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import * as analytics from "../../controllers/admin/analytics.controller.js";

const router = Router();
router.use(requireAdmin);

router.get("/revenue", analytics.getRevenueReport);
router.get("/bookings", analytics.getBookingsReport);
router.get("/customers", analytics.getCustomersReport);
router.get("/leads", analytics.getLeadsReport);
router.get("/technicians", analytics.getTechniciansReport);

export default router;
