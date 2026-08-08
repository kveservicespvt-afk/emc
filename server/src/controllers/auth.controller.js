import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { generateOtp, hashOtp, verifyOtp, otpExpiryDate, deliverOtp, isDevFallbackOtp } from "../lib/otp.js";
import { badRequest, unauthorized, notFound } from "../lib/errors.js";

const otpRequestSchema = z.object({
  phone: z.string().min(10).max(15),
});

export async function requestOtp(req, res, next) {
  try {
    const { phone } = otpRequestSchema.parse(req.body);
    const otp = generateOtp();
    const otpCodeHash = await hashOtp(otp);
    const otpExpiresAt = otpExpiryDate();

    const user = await prisma.user.upsert({
      where: { phone },
      update: { otpCodeHash, otpExpiresAt },
      create: {
        phone,
        name: "New Customer",
        role: "CUSTOMER",
        otpCodeHash,
        otpExpiresAt,
      },
    });

    const devOtp = deliverOtp(phone, otp);
    res.json({
      message: "OTP sent",
      isNewUser: user.name === "New Customer",
      ...(devOtp ? { devOtp } : {}),
    });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid phone number", err.issues));
    next(err);
  }
}

const otpVerifySchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(6),
  name: z.string().min(2).optional(),
});

export async function verifyOtpCode(req, res, next) {
  try {
    const { phone, otp, name } = otpVerifySchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return next(notFound("No OTP request found for this number"));

    // Dev-only shortcut (SHOW_DEV_OTP=true): "123456" always verifies, skipping
    // the real hash/expiry check below entirely. Real OTP flow is untouched when
    // this doesn't apply.
    if (!isDevFallbackOtp(otp)) {
      if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
        return next(badRequest("OTP has expired — request a new one"));
      }
      const valid = await verifyOtp(otp, user.otpCodeHash);
      if (!valid) return next(unauthorized("Incorrect OTP"));
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        otpVerified: true,
        otpCodeHash: null,
        otpExpiresAt: null,
        ...(name ? { name } : {}),
      },
    });

    const token = signToken(updated);
    res.json({ token, user: sanitizeUser(updated) });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid OTP payload", err.issues));
    next(err);
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Shared credential check, parameterized by which roles are allowed to authenticate
// through the calling endpoint. Returns the same generic error on a wrong password
// AND on a role mismatch, so neither endpoint leaks which emails belong to admins.
async function loginWithRoles(email, password, allowedRoles) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !allowedRoles.includes(user.role)) {
    return null;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

export async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await loginWithRoles(email, password, ["CUSTOMER"]);
    if (!user) return next(unauthorized("Invalid email or password"));

    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid login payload", err.issues));
    next(err);
  }
}

export async function adminLogin(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await loginWithRoles(email, password, ["ADMIN", "STAFF"]);
    if (!user) return next(unauthorized("Invalid email or password"));

    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid login payload", err.issues));
    next(err);
  }
}

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(10).max(15).optional(),
});

export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return next(badRequest("An account with this email already exists"));

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: "CUSTOMER",
      },
    });

    const token = signToken(user);
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    if (err instanceof z.ZodError) return next(badRequest("Invalid registration payload", err.issues));
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return next(notFound("User not found"));
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

function sanitizeUser(user) {
  const { passwordHash, otpCodeHash, otpExpiresAt, internalNotes, ...safe } = user;
  return safe;
}
