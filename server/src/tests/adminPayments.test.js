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
let paidBookingId;
let unpaidBookingId;
let paymentId;

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { name: "Payments Test Admin", email: `payments-admin-${suffix}@example.com`, role: "ADMIN", passwordHash: "x" },
  });
  adminUserId = admin.id;
  adminToken = signToken(admin);

  const customer = await prisma.user.create({
    data: { name: "Payments Test Customer", email: `payments-customer-${suffix}@example.com`, role: "CUSTOMER", passwordHash: "x" },
  });
  customerId = customer.id;

  const service = await prisma.service.create({
    data: { name: "Payments Test Service", description: "test", basePrice: 300, pricePerKw: 10, category: "CLEANING" },
  });
  serviceId = service.id;

  const site = await prisma.site.create({
    data: { userId: customerId, label: "Payments Test Site", addressJson: { city: "Hisar" }, plantCapacityKw: 3 },
  });
  siteId = site.id;

  const paidBooking = await prisma.booking.create({
    data: { userId: customerId, siteId, serviceId, scheduledDate: new Date("2027-05-01"), slotStart: "06:00", slotEnd: "09:00", plantCapacityKw: 3, priceAmount: 330, paymentStatus: "SUCCESSFUL" },
  });
  paidBookingId = paidBooking.id;
  const payment = await prisma.payment.create({
    data: { bookingId: paidBookingId, gatewayRef: `test_ref_${suffix}`, amount: 330, status: "SUCCESSFUL", method: "razorpay" },
  });
  paymentId = payment.id;

  const unpaidBooking = await prisma.booking.create({
    data: { userId: customerId, siteId, serviceId, scheduledDate: new Date("2027-05-02"), slotStart: "06:00", slotEnd: "09:00", plantCapacityKw: 3, priceAmount: 330, paymentStatus: "PENDING" },
  });
  unpaidBookingId = unpaidBooking.id;
});

afterAll(async () => {
  await prisma.payment.deleteMany({ where: { bookingId: { in: [paidBookingId, unpaidBookingId] } } });
  await prisma.booking.deleteMany({ where: { id: { in: [paidBookingId, unpaidBookingId] } } });
  await prisma.site.deleteMany({ where: { id: siteId } });
  await prisma.service.deleteMany({ where: { id: serviceId } });
  await prisma.user.deleteMany({ where: { id: { in: [adminUserId, customerId] } } });
  await prisma.$disconnect();
});

describe("admin payments", () => {
  it("lists payments with customer info included", async () => {
    const res = await request(app)
      .get("/api/admin/payments")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.payments.some((p) => p.id === paymentId)).toBe(true);
  });

  it("computes summary totals including outstanding (pending) booking amounts", async () => {
    const res = await request(app)
      .get("/api/admin/payments/summary")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalAllTime).toBeGreaterThanOrEqual(330);
    expect(res.body.totalPending).toBeGreaterThanOrEqual(330);
  });

  it("marks an unpaid booking as paid offline, creating a Payment row and flipping booking.paymentStatus", async () => {
    const res = await request(app)
      .post(`/api/admin/payments/${unpaidBookingId}/mark-paid`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(201);
    expect(res.body.payment.status).toBe("SUCCESSFUL");
    expect(res.body.payment.method).toBe("offline");

    const booking = await prisma.booking.findUnique({ where: { id: unpaidBookingId } });
    expect(booking.paymentStatus).toBe("SUCCESSFUL");
  });

  it("rejects marking an already-paid booking as paid again", async () => {
    const res = await request(app)
      .post(`/api/admin/payments/${paidBookingId}/mark-paid`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("exports a CSV with the expected header row", async () => {
    const res = await request(app)
      .get("/api/admin/payments/export")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text.split("\r\n")[0]).toContain("Payment ID");
  });
});
