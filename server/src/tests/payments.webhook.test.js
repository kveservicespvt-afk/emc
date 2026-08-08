import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

const app = createApp();
const testEmail = `webhook-test-${Date.now()}@example.com`;
let token;
let bookingId;
let serviceId;
let siteId;

beforeAll(async () => {
  const service = await prisma.service.create({
    data: { name: "Test Cleaning", description: "test", basePrice: 100, pricePerKw: 10, category: "CLEANING" },
  });
  serviceId = service.id;

  const registerRes = await request(app)
    .post("/api/auth/register")
    .send({ name: "Webhook Tester", email: testEmail, password: "password123" });
  token = registerRes.body.token;

  const siteRes = await request(app)
    .post("/api/sites")
    .set("Authorization", `Bearer ${token}`)
    .send({
      label: "Test Site",
      addressJson: { line1: "1 Test St", city: "Hisar", state: "Haryana", pincode: "125001" },
      plantCapacityKw: 5,
    });
  siteId = siteRes.body.site.id;

  const bookingRes = await request(app)
    .post("/api/bookings")
    .set("Authorization", `Bearer ${token}`)
    .send({ siteId, serviceId, scheduledDate: "2027-01-15", slotStart: "06:00", slotEnd: "09:00" });
  bookingId = bookingRes.body.booking.id;
});

afterAll(async () => {
  await prisma.payment.deleteMany({ where: { bookingId } });
  await prisma.booking.deleteMany({ where: { id: bookingId } });
  await prisma.site.deleteMany({ where: { id: siteId } });
  await prisma.service.deleteMany({ where: { id: serviceId } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.$disconnect();
});

describe("POST /api/payments/webhook", () => {
  it("is idempotent when the same gatewayRef is replayed", async () => {
    const gatewayRef = `pay_test_${bookingId}`;
    const payload = { bookingId, gatewayRef, amount: 150, status: "SUCCESSFUL" };

    const first = await request(app).post("/api/payments/webhook").send(payload);
    expect(first.status).toBe(200);
    expect(first.body.duplicate).toBe(false);

    const second = await request(app).post("/api/payments/webhook").send(payload);
    expect(second.status).toBe(200);
    expect(second.body.duplicate).toBe(true);

    const payments = await prisma.payment.findMany({ where: { bookingId } });
    expect(payments).toHaveLength(1);

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(booking.paymentStatus).toBe("SUCCESSFUL");
    expect(booking.status).toBe("CONFIRMED");
  });
});
