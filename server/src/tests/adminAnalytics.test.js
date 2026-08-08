import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";

const app = createApp();
const suffix = Date.now();
let adminToken;
let adminUserId;
let leadId;

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { name: "Analytics Test Admin", email: `analytics-admin-${suffix}@example.com`, role: "ADMIN", passwordHash: "x" },
  });
  adminUserId = admin.id;
  adminToken = signToken(admin);

  const createdAt = new Date();
  const contactedAt = new Date(createdAt.getTime() + 3 * 60 * 60 * 1000); // 3 hours later
  const lead = await prisma.lead.create({
    data: { name: "Analytics Test Lead", phone: `+91900${suffix % 100000}`, leadType: "GENERAL", status: "CONTACTED", createdAt, contactedAt },
  });
  leadId = lead.id;
});

afterAll(async () => {
  await prisma.lead.deleteMany({ where: { id: leadId } });
  await prisma.user.deleteMany({ where: { id: adminUserId } });
  await prisma.$disconnect();
});

describe("admin analytics endpoints", () => {
  it("GET /revenue returns bucketed totals shaped correctly", async () => {
    const res = await request(app).get("/api/admin/analytics/revenue").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("buckets");
    expect(res.body).toHaveProperty("totals.total");
  });

  it("GET /bookings returns status/city/service breakdowns", async () => {
    const res = await request(app).get("/api/admin/analytics/bookings").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("byStatus");
    expect(res.body).toHaveProperty("byCity");
    expect(res.body).toHaveProperty("byService");
  });

  it("GET /customers returns new-customer trend and repeat/AMC splits", async () => {
    const res = await request(app).get("/api/admin/analytics/customers").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("newCustomersOverTime");
    expect(res.body).toHaveProperty("repeatVsOneTime.repeat");
    expect(res.body).toHaveProperty("amcVsOneTimeSubscribers.amcSubscribers");
  });

  it("GET /leads computes conversion rate and avg time-to-contact using the seeded lead", async () => {
    const res = await request(app).get("/api/admin/analytics/leads").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.general.received).toBeGreaterThanOrEqual(1);
    expect(res.body.general.avgTimeToContactHours).toBeGreaterThan(2.9);
    expect(res.body.general.avgTimeToContactHours).toBeLessThan(3.1);
  });

  it("GET /technicians returns per-technician stats", async () => {
    const res = await request(app).get("/api/admin/analytics/technicians").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.technicians)).toBe(true);
  });

  it("supports format=csv on the bookings report", async () => {
    const res = await request(app)
      .get("/api/admin/analytics/bookings")
      .query({ format: "csv" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text.split("\r\n")[0]).toContain("Status");
  });
});
