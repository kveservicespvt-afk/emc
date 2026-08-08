import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";

const app = createApp();
let adminToken;
let adminUserId;
let commercialLeadId;
let generalLeadId;

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { name: "Leads Test Admin", email: `leads-admin-${Date.now()}@example.com`, role: "ADMIN", passwordHash: "x" },
  });
  adminUserId = admin.id;
  adminToken = signToken(admin);

  const phoneBase = `+91901${Date.now() % 100000}`;
  const commercial = await prisma.lead.create({
    data: {
      name: "Commercial Quote Test Lead",
      phone: `${phoneBase}1`,
      city: "Hisar",
      plantCapacityKw: 50,
      source: "amc_commercial_quote",
      leadType: "COMMERCIAL_QUOTE",
      message: "Need a quote for our factory rooftop",
    },
  });
  commercialLeadId = commercial.id;

  const general = await prisma.lead.create({
    data: { name: "General Test Lead", phone: `${phoneBase}2`, source: "contact_page", leadType: "GENERAL" },
  });
  generalLeadId = general.id;
});

afterAll(async () => {
  await prisma.lead.deleteMany({ where: { id: { in: [commercialLeadId, generalLeadId] } } });
  await prisma.user.deleteMany({ where: { id: adminUserId } });
  await prisma.$disconnect();
});

describe("admin leads", () => {
  it("filters by leadType=COMMERCIAL_QUOTE and returns plantCapacityKw + message", async () => {
    const res = await request(app)
      .get("/api/admin/leads")
      .query({ leadType: "COMMERCIAL_QUOTE" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.leads.some((l) => l.id === generalLeadId)).toBe(false);
    const lead = res.body.leads.find((l) => l.id === commercialLeadId);
    expect(lead).toBeDefined();
    expect(lead.plantCapacityKw).toBe(50);
    expect(lead.message).toBe("Need a quote for our factory rooftop");
  });

  it("updates lead status", async () => {
    const res = await request(app)
      .patch(`/api/admin/leads/${commercialLeadId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "CONTACTED" });
    expect(res.status).toBe(200);
    expect(res.body.lead.status).toBe("CONTACTED");
  });
});

describe("public lead submission with COMMERCIAL_QUOTE type", () => {
  it("creates a lead tagged COMMERCIAL_QUOTE via POST /api/leads", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({
        name: "E2E Commercial Lead",
        phone: `+91902${Date.now() % 100000}`,
        plantCapacityKw: 120,
        message: "Testing end to end",
        source: "amc_commercial_quote",
        leadType: "COMMERCIAL_QUOTE",
      });
    expect(res.status).toBe(201);
    expect(res.body.lead.leadType).toBe("COMMERCIAL_QUOTE");
    await prisma.lead.delete({ where: { id: res.body.lead.id } });
  });
});
