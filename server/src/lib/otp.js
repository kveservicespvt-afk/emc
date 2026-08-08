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

// No real SMS/WhatsApp provider is wired up yet (per spec Section 3, deferred
// until a paid API is added). We always log the OTP server-side, and — only when
// SHOW_DEV_OTP=true — also hand it back in the API response so the login flow is
// usable for testing/demo (including on a live deploy) before real delivery exists.
export function deliverOtp(phone, otp) {
  logger.info({ phone, otp }, "[MOCK OTP] would be sent via SMS/WhatsApp");
  return config.showDevOtp ? otp : undefined;
}
