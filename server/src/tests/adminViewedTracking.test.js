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
let leadId;

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { name: "Viewed Tracking Test Admin", email: `viewed-admin-${suffix}@example.com`, role: "ADMIN", passwordHash: "x" },
  });
  adminUserId = admin.id;
  adminToken = signToken(admin);

  const customer = await prisma.user.create({
    data: { name: "Viewed Tracking Test Customer", email: `viewed-customer-${suffix}@example.com`, role: "CUSTOMER", passwordHash: "x" },
  });
  customerId = customer.id;

  const service = await prisma.service.create({
    data: { name: "Viewed Tracking Test Service", description: "test", basePrice: 200, pricePerKw: 20, category: "CLEANING" },
  });
  serviceId = service.id;

  const site = await prisma.site.create({
    data: { userId: customerId, label: "Viewed Tracking Test Site", addressJson: { city: "Hisar" }, plantCapacityKw: 3 },
  });
  siteId = site.id;

  const booking = await prisma.booking.create({
    data: { userId: customerId, siteId, serviceId, scheduledDate: new Date("2027-06-15"), slotStart: "06:00", slotEnd: "09:00", plantCapacityKw: 3, priceAmount: 300 },
  });
  bookingId = booking.id;

  const lead = await prisma.lead.create({
    data: { name: "Viewed Tracking Test Lead", phone: `+91901${suffix % 100000}`, leadType: "GENERAL" },
  });
  leadId = lead.id;
});

afterAll(async () => {
  await prisma.lead.deleteMany({ where: { id: leadId } });
  await prisma.booking.deleteMany({ where: { id: bookingId } });
  await prisma.site.deleteMany({ where: { id: siteId } });
  await prisma.service.deleteMany({ where: { id: serviceId } });
  await prisma.user.deleteMany({ where: { id: { in: [adminUserId, customerId] } } });
  await prisma.$disconnect();
});

describe("booking viewed tracking", () => {
  it("badge count includes an unviewed unassigned booking", async () => {
    const res = await request(app).get("/api/admin/badge-counts").set("Authorization", `Bearer ${adminToken}`);
    expect(res.body.unassignedBookings).toBeGreaterThanOrEqual(1);
  });

  it("stamps viewedByAdminAt the first time the detail page is opened, and clears it from the badge count", async () => {
    const detail = await request(app).get(`/api/admin/bookings/${bookingId}`).set("Authorization", `Bearer ${adminToken}`);
    expect(detail.body.booking.viewedByAdminAt).not.toBeNull();
    const firstViewedAt = detail.body.booking.viewedByAdminAt;

    const badgesAfter = await request(app).get("/api/admin/badge-counts").set("Authorization", `Bearer ${adminToken}`);
    const stillCounted = await prisma.booking.count({
      where: { technicianId: null, status: { in: ["PENDING", "CONFIRMED"] }, viewedByAdminAt: null, id: bookingId },
    });
    expect(stillCounted).toBe(0);
    expect(badgesAfter.status).toBe(200);

    await new Promise((r) => setTimeout(r, 10));
    const secondDetail = await request(app).get(`/api/admin/bookings/${bookingId}`).set("Authorization", `Bearer ${adminToken}`);
    expect(secondDetail.body.booking.viewedByAdminAt).toBe(firstViewedAt);
  });
});

describe("lead viewed tracking", () => {
  it("badge count includes the unviewed new lead", async () => {
    const res = await request(app).get("/api/admin/badge-counts").set("Authorization", `Bearer ${adminToken}`);
    expect(res.body.newGeneralQueries).toBeGreaterThanOrEqual(1);
  });

  it("POST /admin/leads/:id/view stamps viewedByAdminAt once and is idempotent", async () => {
    const first = await request(app).post(`/api/admin/leads/${leadId}/view`).set("Authorization", `Bearer ${adminToken}`);
    expect(first.status).toBe(200);
    expect(first.body.lead.viewedByAdminAt).not.toBeNull();
    const firstViewedAt = first.body.lead.viewedByAdminAt;

    const stillCounted = await prisma.lead.count({ where: { id: leadId, viewedByAdminAt: null } });
    expect(stillCounted).toBe(0);

    await new Promise((r) => setTimeout(r, 10));
    const second = await request(app).post(`/api/admin/leads/${leadId}/view`).set("Authorization", `Bearer ${adminToken}`);
    expect(second.body.lead.viewedByAdminAt).toBe(firstViewedAt);
  });
});
