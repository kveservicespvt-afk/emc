import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";

const app = createApp();
let adminToken;
let adminUserId;
let customerToken;
let customerUserId;
let siteId;
let serviceId;
let bookingId;

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { name: "CRUD Test Admin", email: `crud-admin-${Date.now()}@example.com`, role: "ADMIN", passwordHash: "x" },
  });
  adminUserId = admin.id;
  adminToken = signToken(admin);

  const customer = await prisma.user.create({
    data: { name: "CRUD Test Customer", email: `crud-customer-${Date.now()}@example.com`, role: "CUSTOMER", passwordHash: "x" },
  });
  customerUserId = customer.id;
  customerToken = signToken(customer);

  const site = await prisma.site.create({
    data: {
      userId: customer.id,
      label: "CRUD Test Site",
      addressJson: { line1: "1 Test St", city: "TestCity", state: "TestState", pincode: "000000" },
      plantCapacityKw: 3,
    },
  });
  siteId = site.id;
});

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { siteId } });
  await prisma.site.deleteMany({ where: { id: siteId } });
  if (serviceId) await prisma.service.deleteMany({ where: { id: serviceId } });
  await prisma.user.deleteMany({ where: { id: { in: [adminUserId, customerUserId] } } });
  await prisma.$disconnect();
});

describe("admin services CRUD", () => {
  it("rejects a non-admin (customer) token", async () => {
    const res = await request(app)
      .post("/api/admin/services")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ name: "x", description: "x", basePrice: 100, category: "CLEANING" });
    expect(res.status).toBe(403);
  });

  it("creates a service as admin", async () => {
    const res = await request(app)
      .post("/api/admin/services")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "CRUD Test Service",
        description: "Created by test",
        basePrice: 150,
        pricePerKw: 15,
        category: "CLEANING",
        featuresJson: ["Feature A", "Feature B"],
      });
    expect(res.status).toBe(201);
    serviceId = res.body.service.id;
    expect(res.body.service.featuresJson).toEqual(["Feature A", "Feature B"]);
  });

  it("updates the service", async () => {
    const res = await request(app)
      .patch(`/api/admin/services/${serviceId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ basePrice: 175, active: false });
    expect(res.status).toBe(200);
    expect(res.body.service.basePrice).toBe(175);
    expect(res.body.service.active).toBe(false);
  });

  it("blocks deletion once a booking references the service", async () => {
    const booking = await prisma.booking.create({
      data: {
        userId: (await prisma.site.findUnique({ where: { id: siteId } })).userId,
        siteId,
        serviceId,
        scheduledDate: new Date("2027-03-01"),
        slotStart: "06:00",
        slotEnd: "09:00",
        plantCapacityKw: 3,
        priceAmount: 220,
      },
    });
    bookingId = booking.id;

    const res = await request(app)
      .delete(`/api/admin/services/${serviceId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
  });

  it("allows deletion once the referencing booking is removed", async () => {
    await prisma.booking.delete({ where: { id: bookingId } });
    const res = await request(app)
      .delete(`/api/admin/services/${serviceId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
    serviceId = null; // already deleted, skip in afterAll
  });
});
