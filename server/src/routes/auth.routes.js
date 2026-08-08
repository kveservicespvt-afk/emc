import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/otp/request", auth.requestOtp);
router.post("/otp/verify", auth.verifyOtpCode);
router.post("/login", auth.login);
router.post("/admin-login", auth.adminLogin);
router.post("/register", auth.register);
router.get("/me", requireAuth, auth.me);

export default router;
