import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import { hashOtp } from "../lib/otp.js";

const app = createApp();
const testPhone = `+91903${Date.now() % 100000}`;
let userId;

// Always seed an already-EXPIRED, non-matching real OTP — proves the fallback
// bypasses both the hash check and the expiry check, not just one of them.
async function seedExpiredOtpState() {
  const expiredHash = await hashOtp("999999");
  await prisma.user.update({
    where: { id: userId },
    data: { otpCodeHash: expiredHash, otpExpiresAt: new Date(Date.now() - 60 * 1000) },
  });
}

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { name: "New Customer", phone: testPhone, role: "CUSTOMER" },
  });
  userId = user.id;
  await seedExpiredOtpState();
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("dev fallback OTP (123456)", () => {
  it("is rejected when SHOW_DEV_OTP is false — only the real (expired) OTP flow applies", async () => {
    const original = config.showDevOtp;
    config.showDevOtp = false;
    try {
      const res = await request(app).post("/api/auth/otp/verify").send({ phone: testPhone, otp: "123456" });
      expect(res.status).toBe(400); // falls through to the real expiry check and fails
    } finally {
      config.showDevOtp = original;
    }
  });

  it("logs in with 123456 when SHOW_DEV_OTP is true, even though the real OTP is expired and doesn't match", async () => {
    expect(config.showDevOtp).toBe(true); // sanity-check the fixture assumption
    const res = await request(app)
      .post("/api/auth/otp/verify")
      .send({ phone: testPhone, otp: "123456", name: "Dev Fallback Tester" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.phone).toBe(testPhone);
  });

  it("still rejects an arbitrary wrong code that isn't the real OTP or 123456", async () => {
    await seedExpiredOtpState(); // previous successful verify cleared otpCodeHash/otpExpiresAt
    const res = await request(app).post("/api/auth/otp/verify").send({ phone: testPhone, otp: "000000" });
    expect(res.status).toBe(400);
  });
});
