import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";

const app = createApp();
const suffix = Date.now();
let adminToken;
let customerToken;
let adminUserId;
let customerId;
let serviceId;
let siteId;
let bookingId;

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { name: "Reschedule Test Admin", email: `reschedule-admin-${suffix}@example.com`, role: "ADMIN", passwordHash: "x" },
  });
  adminUserId = admin.id;
  adminToken = signToken(admin);

  const customer = await prisma.user.create({
    data: { name: "Reschedule Test Customer", email: `reschedule-customer-${suffix}@example.com`, role: "CUSTOMER", passwordHash: "x" },
  });
  customerId = customer.id;
  customerToken = signToken(customer);

  const service = await prisma.service.create({
    data: { name: "Reschedule Test Service", description: "test", basePrice: 200, pricePerKw: 20, category: "CLEANING" },
  });
  serviceId = service.id;

  const site = await prisma.site.create({
    data: { userId: customerId, label: "Reschedule Test Site", addressJson: { city: "Hisar" }, plantCapacityKw: 3 },
  });
  siteId = site.id;

  const booking = await prisma.booking.create({
    data: { userId: customerId, siteId, serviceId, scheduledDate: new Date("2027-07-01"), slotStart: "06:00", slotEnd: "09:00", plantCapacityKw: 3, priceAmount: 300 },
  });
  bookingId = booking.id;
});

afterAll(async () => {
  await prisma.bookingActivityLog.deleteMany({ where: { bookingId } });
  await prisma.booking.deleteMany({ where: { id: bookingId } });
  await prisma.site.deleteMany({ where: { id: siteId } });
  await prisma.service.deleteMany({ where: { id: serviceId } });
  await prisma.user.deleteMany({ where: { id: { in: [adminUserId, customerId] } } });
  await prisma.$disconnect();
});

describe("admin reschedule", () => {
  it("rejects a reschedule into the blocked 11am-3pm SOP window", async () => {
    const res = await request(app)
      .patch(`/api/admin/bookings/${bookingId}/reschedule`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ scheduledDate: "2027-07-05", slotStart: "12:00", slotEnd: "13:00" });
    expect(res.status).toBe(400);
  });

  it("reschedules the booking, logs the change, and stamps rescheduledAt", async () => {
    const res = await request(app)
      .patch(`/api/admin/bookings/${bookingId}/reschedule`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ scheduledDate: "2027-07-10", slotStart: "16:00", slotEnd: "18:30" });
    expect(res.status).toBe(200);
    expect(res.body.booking.slotStart).toBe("16:00");
    expect(res.body.booking.rescheduledAt).not.toBeNull();
    expect(res.body.booking.activityLog[0].message).toContain("Rescheduled");
  });
});

describe("customer reschedule acknowledgement", () => {
  it("shows the unacknowledged reschedule on first view, then clears it on the next", async () => {
    const first = await request(app).get(`/api/bookings/${bookingId}`).set("Authorization", `Bearer ${customerToken}`);
    expect(first.status).toBe(200);
    expect(first.body.booking.rescheduledAt).not.toBeNull();
    expect(first.body.booking.rescheduleAcknowledgedAt).toBeNull();

    const second = await request(app).get(`/api/bookings/${bookingId}`).set("Authorization", `Bearer ${customerToken}`);
    expect(second.body.booking.rescheduleAcknowledgedAt).not.toBeNull();
  });

  it("re-arms the acknowledgement (back to unseen) on a subsequent reschedule", async () => {
    await request(app)
      .patch(`/api/admin/bookings/${bookingId}/reschedule`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ scheduledDate: "2027-07-15", slotStart: "06:00", slotEnd: "09:00" });

    const res = await request(app).get(`/api/bookings/${bookingId}`).set("Authorization", `Bearer ${customerToken}`);
    expect(res.body.booking.rescheduleAcknowledgedAt).toBeNull();
  });
});
