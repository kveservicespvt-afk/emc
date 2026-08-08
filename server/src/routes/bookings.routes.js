import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import * as bookings from "../controllers/bookings.controller.js";

const router = Router();

router.use(requireAuth);
router.post("/", bookings.createBooking);
router.get("/me", bookings.listMyBookings);
router.get("/:id", bookings.getBooking);
router.patch("/:id/status", requireRole("ADMIN", "STAFF", "TECHNICIAN"), bookings.updateBookingStatus);

export default router;
