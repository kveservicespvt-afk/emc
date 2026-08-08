import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as payments from "../controllers/payments.controller.js";

const router = Router();

// Real Razorpay webhooks arrive unauthenticated (verified via signature instead).
router.post("/webhook", payments.webhook);

router.use(requireAuth);
router.post("/create-order", payments.createOrder);
router.post("/mock-pay", payments.mockPay);
router.get("/me", payments.listMyPayments);

export default router;
