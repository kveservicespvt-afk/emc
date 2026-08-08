import bcrypt from "bcryptjs";
import { config } from "../config.js";
import { logger } from "./logger.js";

const OTP_TTL_MS = 5 * 60 * 1000;

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

export async function verifyOtp(otp, hash) {
  if (!hash) return false;
  return bcrypt.compare(otp, hash);
}

export function otpExpiryDate() {
  return new Date(Date.now() + OTP_TTL_MS);
}

// In Pass 1 there is no real SMS/WhatsApp provider wired up (per spec Section 3,
// deferred until a paid API is added). We log the OTP server-side and — outside of
// production — hand it back in the API response so the flow is testable end-to-end.
export function deliverOtp(phone, otp) {
  logger.info({ phone, otp }, "[MOCK OTP] would be sent via SMS/WhatsApp");
  return config.otpMockMode && config.nodeEnv !== "production" ? otp : undefined;
}
