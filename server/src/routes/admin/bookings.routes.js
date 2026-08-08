import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth.js";
import * as bookings from "../../controllers/admin/bookings.controller.js";

const router = Router();
router.use(requireAdmin);

router.get("/", bookings.listBookingsAdmin);
router.get("/:id", bookings.getBookingAdmin);

export default router;
