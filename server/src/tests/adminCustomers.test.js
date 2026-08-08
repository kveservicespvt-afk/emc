import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";

const app = createApp();
let adminToken;
let adminUserId;
let customerId;
let siteId;
let serviceId;
let amcPlanId;
const bookingIds = [];
let subscriptionId;

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { name: "Customers Test Admin", email: `customers-admin-${Date.now()}@example.com`, role: "ADMIN", passwordHash: "x" },
  });
  adminUserId = admin.id;
  adminToken = signToken(admin);

  const customer = await prisma.user.create({
    data: { name: "Aggregation Test Customer", phone: `+91900000${Date.now() % 10000}`, role: "CUSTOMER", passwordHash: "x" },
  });
  customerId = customer.id;

  const site = await prisma.site.create({
    data: {
      userId: customer.id,
      label: "Agg Test Site",
      addressJson: { line1: "1 Test St", city: "AggTestCity", state: "TestState", pincode: "000000" },
      plantCapacityKw: 3,
    },
  });
  siteId = site.id;

  const service = await prisma.service.create({
    data: { name: "Agg Test Service", description: "x", basePrice: 100, pricePerKw: 10, category: "CLEANING" },
  });
  serviceId = service.id;

  const amcPlan = await prisma.aMCPlan.create({
    data: { name: "Agg Test Plan", frequencyPerYear: 4, basePrice: 100, pricePerKw: 10, includesJson: {} },
  });
  amcPlanId = amcPlan.id;

  const b1 = await prisma.booking.create({
    data: {
      userId: customer.id, siteId, serviceId,
      scheduledDate: new Date("2027-01-10"), slotStart: "06:00", slotEnd: "09:00",
      plantCapacityKw: 3, priceAmount: 130,
    },
  });
  const b2 = await prisma.booking.create({
    data: {
      userId: customer.id, siteId, serviceId,
      scheduledDate: new Date("2027-02-15"), slotStart: "06:00", slotEnd: "09:00",
      plantCapacityKw: 3, priceAmount: 130,
    },
  });
  bookingIds.push(b1.id, b2.id);

  const subscription = await prisma.subscription.create({
    data: { userId: customer.id, siteId, amcPlanId, renewalDate: new Date("2028-01-01"), status: "ACTIVE" },
  });
  subscriptionId = subscription.id;
});

afterAll(async () => {
  await prisma.subscription.deleteMany({ where: { id: subscriptionId } });
  await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  await prisma.site.deleteMany({ where: { id: siteId } });
  await prisma.service.deleteMany({ where: { id: serviceId } });
  await prisma.aMCPlan.deleteMany({ where: { id: amcPlanId } });
  await prisma.user.deleteMany({ where: { id: { in: [adminUserId, customerId] } } });
  await prisma.$disconnect();
});

describe("admin customers aggregation", () => {
  it("computes bookingCount, hasActiveAmc, and lastBookingDate correctly in the list", async () => {
    const res = await request(app)
      .get("/api/admin/customers")
      .query({ search: "Aggregation Test Customer" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const row = res.body.customers.find((c) => c.id === customerId);
    expect(row).toBeDefined();
    expect(row.bookingCount).toBe(2);
    expect(row.hasActiveAmc).toBe(true);
    expect(new Date(row.lastBookingDate).toISOString().slice(0, 10)).toBe("2027-02-15");
  });

  it("returns full detail with bookings and subscriptions on the detail endpoint", async () => {
    const res = await request(app)
      .get(`/api/admin/customers/${customerId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.customer.bookings).toHaveLength(2);
    expect(res.body.customer.subscriptions).toHaveLength(1);
  });

  it("saves internal notes", async () => {
    const res = await request(app)
      .patch(`/api/admin/customers/${customerId}/notes`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ internalNotes: "VIP customer, prefers mornings" });
    expect(res.status).toBe(200);
    expect(res.body.customer.internalNotes).toBe("VIP customer, prefers mornings");
  });
});
