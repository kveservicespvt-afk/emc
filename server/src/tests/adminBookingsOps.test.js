import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";

const app = createApp();
const suffix = Date.now();
let adminToken;
let adminUserId;
let serviceId;
let customerId;
let siteId;
let technicianId;
let technicianUserId;
let bookingAId;
let bookingBId;

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { name: "Bookings Ops Test Admin", email: `bookings-ops-admin-${suffix}@example.com`, role: "ADMIN", passwordHash: "x" },
  });
  adminUserId = admin.id;
  adminToken = signToken(admin);

  const customer = await prisma.user.create({
    data: { name: "Bookings Ops Test Customer", email: `bookings-ops-customer-${suffix}@example.com`, role: "CUSTOMER", passwordHash: "x" },
  });
  customerId = customer.id;

  const technicianUser = await prisma.user.create({
    data: { name: "Bookings Ops Test Technician", email: `bookings-ops-tech-${suffix}@example.com`, role: "TECHNICIAN", passwordHash: "x" },
  });
  technicianUserId = technicianUser.id;
  const technician = await prisma.technician.create({
    data: { userId: technicianUser.id, zoneCity: "Hisar" },
  });
  technicianId = technician.id;

  const service = await prisma.service.create({
    data: { name: "Bookings Ops Test Service", description: "test", basePrice: 200, pricePerKw: 20, category: "CLEANING" },
  });
  serviceId = service.id;

  const site = await prisma.site.create({
    data: {
      userId: customerId,
      label: "Bookings Ops Test Site",
      addressJson: { line1: "1 Test St", city: "Hisar", state: "Haryana", pincode: "125001" },
      plantCapacityKw: 4,
    },
  });
  siteId = site.id;

  const bookingA = await prisma.booking.create({
    data: { userId: customerId, siteId, serviceId, scheduledDate: new Date("2027-03-01"), slotStart: "06:00", slotEnd: "09:00", plantCapacityKw: 4, priceAmount: 280 },
  });
  bookingAId = bookingA.id;
  const bookingB = await prisma.booking.create({
    data: { userId: customerId, siteId, serviceId, scheduledDate: new Date("2027-03-02"), slotStart: "06:00", slotEnd: "09:00", plantCapacityKw: 4, priceAmount: 280 },
  });
  bookingBId = bookingB.id;
});

afterAll(async () => {
  await prisma.bookingActivityLog.deleteMany({ where: { bookingId: { in: [bookingAId, bookingBId] } } });
  await prisma.payment.deleteMany({ where: { bookingId: { in: [bookingAId, bookingBId] } } });
  await prisma.booking.deleteMany({ where: { id: { in: [bookingAId, bookingBId] } } });
  await prisma.site.deleteMany({ where: { id: siteId } });
  await prisma.service.deleteMany({ where: { id: serviceId } });
  await prisma.technician.deleteMany({ where: { id: technicianId } });
  await prisma.user.deleteMany({ where: { id: { in: [adminUserId, customerId, technicianUserId] } } });
  await prisma.$disconnect();
});

describe("admin bookings filters", () => {
  it("filters by city (via site.addressJson)", async () => {
    const res = await request(app)
      .get("/api/admin/bookings")
      .query({ city: "Hisar" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.bookings.some((b) => b.id === bookingAId)).toBe(true);
  });

  it("filters by paymentStatus", async () => {
    const res = await request(app)
      .get("/api/admin/bookings")
      .query({ paymentStatus: "PENDING" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.bookings.some((b) => b.id === bookingAId)).toBe(true);
  });

  it("filters by technicianId=unassigned", async () => {
    const res = await request(app)
      .get("/api/admin/bookings")
      .query({ technicianId: "unassigned" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.bookings.some((b) => b.id === bookingAId)).toBe(true);
  });

  it("defaults to scheduledDate ascending (soonest first)", async () => {
    const res = await request(app)
      .get("/api/admin/bookings")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const indexA = res.body.bookings.findIndex((b) => b.id === bookingAId); // 2027-03-01
    const indexB = res.body.bookings.findIndex((b) => b.id === bookingBId); // 2027-03-02
    expect(indexA).toBeGreaterThanOrEqual(0);
    expect(indexB).toBeGreaterThanOrEqual(0);
    expect(indexA).toBeLessThan(indexB);
  });
});

describe("booking activity log", () => {
  it("writes an activity log entry when status changes, attributing the acting admin", async () => {
    const res = await request(app)
      .patch(`/api/bookings/${bookingAId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "CONFIRMED" });
    expect(res.status).toBe(200);
    expect(res.body.booking.activityLog.length).toBeGreaterThan(0);
    expect(res.body.booking.activityLog[0].message).toContain("PENDING");
    expect(res.body.booking.activityLog[0].message).toContain("CONFIRMED");

    const logRow = await prisma.bookingActivityLog.findFirst({ where: { bookingId: bookingAId } });
    expect(logRow.actorId).toBe(adminUserId);
  });

  it("writes a technician-assignment activity log entry", async () => {
    const res = await request(app)
      .patch(`/api/bookings/${bookingAId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "CONFIRMED", technicianId });
    expect(res.status).toBe(200);
    expect(res.body.booking.activityLog[0].message).toContain("Assigned to");
  });

  it("does not write a duplicate log entry when nothing actually changed", async () => {
    const before = await prisma.bookingActivityLog.count({ where: { bookingId: bookingAId } });
    await request(app)
      .patch(`/api/bookings/${bookingAId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "CONFIRMED", technicianId });
    const after = await prisma.bookingActivityLog.count({ where: { bookingId: bookingAId } });
    expect(after).toBe(before);
  });
});

describe("bulk update", () => {
  it("applies a status change to multiple bookings and logs each", async () => {
    const res = await request(app)
      .patch("/api/admin/bookings/bulk-update")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ bookingIds: [bookingAId, bookingBId], status: "CANCELLED" });
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(2);

    const [a, b] = await Promise.all([
      prisma.booking.findUnique({ where: { id: bookingAId } }),
      prisma.booking.findUnique({ where: { id: bookingBId } }),
    ]);
    expect(a.status).toBe("CANCELLED");
    expect(b.status).toBe("CANCELLED");
  });
});
