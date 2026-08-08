import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

const app = createApp();
const testEmail = `booking-flow-test-${Date.now()}@example.com`;
let token;
let serviceId;
let siteId;

beforeAll(async () => {
  const service = await prisma.service.create({
    data: { name: "Test Booking Flow Service", description: "test", basePrice: 200, pricePerKw: 20, category: "CLEANING" },
  });
  serviceId = service.id;

  const registerRes = await request(app)
    .post("/api/auth/register")
    .send({ name: "Booking Flow Tester", email: testEmail, password: "password123" });
  token = registerRes.body.token;

  const siteRes = await request(app)
    .post("/api/sites")
    .set("Authorization", `Bearer ${token}`)
    .send({
      label: "Flow Test Site",
      addressJson: { line1: "1 Test St", city: "Hisar", state: "Haryana", pincode: "125001" },
      plantCapacityKw: 4,
    });
  siteId = siteRes.body.site.id;
});

afterAll(async () => {
  await prisma.payment.deleteMany({ where: { booking: { siteId } } });
  await prisma.booking.deleteMany({ where: { siteId } });
  await prisma.site.deleteMany({ where: { id: siteId } });
  await prisma.service.deleteMany({ where: { id: serviceId } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.$disconnect();
});

describe("booking creation -> payment -> status update flow", () => {
  it("rejects a booking in the blocked 11-3 window", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ siteId, serviceId, scheduledDate: "2027-02-10", slotStart: "12:00", slotEnd: "13:00" });
    expect(res.status).toBe(400);
  });

  it("creates a booking with server-computed price, pays it via mock-pay, and confirms it", async () => {
    const createRes = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ siteId, serviceId, scheduledDate: "2027-02-10", slotStart: "06:00", slotEnd: "09:00" });

    expect(createRes.status).toBe(201);
    const booking = createRes.body.booking;
    expect(booking.priceAmount).toBe(280); // 200 base + 20 * 4kW
    expect(booking.status).toBe("PENDING");

    const orderRes = await request(app)
      .post("/api/payments/create-order")
      .set("Authorization", `Bearer ${token}`)
      .send({ bookingId: booking.id });
    expect(orderRes.status).toBe(200);
    expect(orderRes.body.amount).toBe(28000); // paise

    const payRes = await request(app)
      .post("/api/payments/mock-pay")
      .set("Authorization", `Bearer ${token}`)
      .send({ bookingId: booking.id, orderId: orderRes.body.orderId });
    expect(payRes.status).toBe(200);
    expect(payRes.body.payment.status).toBe("SUCCESSFUL");

    const getRes = await request(app)
      .get(`/api/bookings/${booking.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.body.booking.status).toBe("CONFIRMED");
    expect(getRes.body.booking.paymentStatus).toBe("SUCCESSFUL");
  });
});
