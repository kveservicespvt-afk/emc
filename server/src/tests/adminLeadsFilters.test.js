import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";

const app = createApp();
let adminToken;
let adminUserId;
let hisarLeadId;
let otherCityLeadId;

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { name: "Leads Filter Test Admin", email: `leads-filter-admin-${Date.now()}@example.com`, role: "ADMIN", passwordHash: "x" },
  });
  adminUserId = admin.id;
  adminToken = signToken(admin);

  const phoneBase = `+91904${Date.now() % 100000}`;
  const hisarLead = await prisma.lead.create({
    data: { name: "City Filter Test Hisar", phone: `${phoneBase}1`, city: "Hisar", leadType: "GENERAL" },
  });
  hisarLeadId = hisarLead.id;
  const otherLead = await prisma.lead.create({
    data: { name: "City Filter Test Delhi", phone: `${phoneBase}2`, city: "Delhi", leadType: "GENERAL" },
  });
  otherCityLeadId = otherLead.id;
});

afterAll(async () => {
  await prisma.adminNote.deleteMany({ where: { entityId: { in: [hisarLeadId, otherCityLeadId] } } });
  await prisma.lead.deleteMany({ where: { id: { in: [hisarLeadId, otherCityLeadId] } } });
  await prisma.user.deleteMany({ where: { id: adminUserId } });
  await prisma.$disconnect();
});

describe("admin leads city/date filters", () => {
  it("filters by city", async () => {
    const res = await request(app)
      .get("/api/admin/leads")
      .query({ city: "Hisar" })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.leads.some((l) => l.id === hisarLeadId)).toBe(true);
    expect(res.body.leads.some((l) => l.id === otherCityLeadId)).toBe(false);
  });

  it("filters by date range", async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await request(app)
      .get("/api/admin/leads")
      .query({ from: future }) // tomorrow onward — should exclude leads created just now
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.leads.some((l) => l.id === hisarLeadId)).toBe(false);
  });

  it("stamps contactedAt the first time status moves to CONTACTED, and doesn't overwrite it later", async () => {
    const first = await request(app)
      .patch(`/api/admin/leads/${hisarLeadId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "CONTACTED" });
    expect(first.body.lead.contactedAt).not.toBeNull();
    const firstContactedAt = first.body.lead.contactedAt;

    await new Promise((r) => setTimeout(r, 10));
    const second = await request(app)
      .patch(`/api/admin/leads/${hisarLeadId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "CONTACTED" });
    expect(second.body.lead.contactedAt).toBe(firstContactedAt);
  });
});

describe("admin notes", () => {
  it("creates and lists notes for a lead", async () => {
    const create = await request(app)
      .post("/api/admin/notes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ entityType: "LEAD", entityId: hisarLeadId, body: "Called, left voicemail" });
    expect(create.status).toBe(201);
    expect(create.body.note.body).toBe("Called, left voicemail");
    expect(create.body.note.author.id).toBe(adminUserId);

    const list = await request(app)
      .get("/api/admin/notes")
      .query({ entityType: "LEAD", entityId: hisarLeadId })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.notes).toHaveLength(1);
  });
});
