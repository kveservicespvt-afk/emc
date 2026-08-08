import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";

const app = createApp();
const suffix = Date.now();
let adminToken;
let adminUserId;
let customerId;
let serviceId;
let siteId;
let bookingId;
let stuckPaymentId;
let freshPaymentId;

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { name: "Needs Attention Test Admin", email: `needs-attn-admin-${suffix}@example.com`, role: "ADMIN", passwordHash: "x" },
  });
  adminUserId = admin.id;
  adminToken = signToken(admin);

  const customer = await prisma.user.create({
    data: { name: "Needs Attention Test Customer", email: `needs-attn-customer-${suffix}@example.com`, role: "CUSTOMER", passwordHash: "x" },
  });
  customerId = customer.id;

  const service = await prisma.service.create({
    data: { name: "Needs Attention Test Service", description: "test", basePrice: 300, pricePerKw: 10, category: "CLEANING" },
  });
  serviceId = service.id;

  const site = await prisma.site.create({
    data: { userId: customerId, label: "Needs Attention Test Site", addressJson: { city: "Hisar" }, plantCapacityKw: 3 },
  });
  siteId = site.id;

  const booking = await prisma.booking.create({
    data: { userId: customerId, siteId, serviceId, scheduledDate: new Date("2027-06-01"), slotStart: "06:00", slotEnd: "09:00", plantCapacityKw: 3, priceAmount: 330 },
  });
  bookingId = booking.id;

  // A payment stuck PENDING for >24h — should surface as an issue.
  const stalePendingAt = new Date(Date.now() - 30 * 60 * 60 * 1000);
  const stuckPayment = await prisma.payment.create({
    data: { bookingId, gatewayRef: `stuck_${suffix}`, amount: 330, status: "PENDING", method: "razorpay", createdAt: stalePendingAt },
  });
  stuckPaymentId = stuckPayment.id;

  // A payment PENDING for only a few minutes — should NOT surface yet.
  const freshPayment = await prisma.payment.create({
    data: { bookingId, gatewayRef: `fresh_${suffix}`, amount: 330, status: "PENDING", method: "razorpay" },
  });
  freshPaymentId = freshPayment.id;
});

afterAll(async () => {
  await prisma.payment.deleteMany({ where: { id: { in: [stuckPaymentId, freshPaymentId] } } });
  await prisma.booking.deleteMany({ where: { id: bookingId } });
  await prisma.site.deleteMany({ where: { id: siteId } });
  await prisma.service.deleteMany({ where: { id: serviceId } });
  await prisma.user.deleteMany({ where: { id: { in: [adminUserId, customerId] } } });
  await prisma.$disconnect();
});

describe("badge counts", () => {
  it("includes a paymentIssues count that reflects stuck-pending/failed payments", async () => {
    const res = await request(app).get("/api/admin/badge-counts").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.paymentIssues).toBeGreaterThanOrEqual(1);
  });
});

describe("needs-attention", () => {
  it("surfaces the unassigned booking, and the stuck-pending payment but not the fresh one", async () => {
    const res = await request(app).get("/api/admin/dashboard-stats/needs-attention").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.unassignedBookings.some((b) => b.id === bookingId)).toBe(true);
    expect(res.body.paymentIssues.some((p) => p.id === stuckPaymentId)).toBe(true);
    expect(res.body.paymentIssues.some((p) => p.id === freshPaymentId)).toBe(false);
  });
});
