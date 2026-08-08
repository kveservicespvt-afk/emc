import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";

const app = createApp();
const suffix = Date.now();
let adminToken;
let adminUserId;
const createdCustomerIds = [];

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { name: "Customers Import Test Admin", email: `customers-import-admin-${suffix}@example.com`, role: "ADMIN", passwordHash: "x" },
  });
  adminUserId = admin.id;
  adminToken = signToken(admin);
});

afterAll(async () => {
  await prisma.site.deleteMany({ where: { user: { id: { in: createdCustomerIds } } } });
  await prisma.user.deleteMany({ where: { id: { in: createdCustomerIds } } });
  await prisma.user.deleteMany({ where: { id: adminUserId } });
  await prisma.$disconnect();
});

describe("POST /admin/customers (manual create)", () => {
  it("creates a customer with a site when city/address/plantCapacityKw are all given", async () => {
    const res = await request(app)
      .post("/api/admin/customers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Manual Add Customer",
        phone: `+91900${suffix % 100000}1`,
        city: "Hisar",
        address: "1 Test Lane",
        plantCapacityKw: 4,
      });
    expect(res.status).toBe(201);
    expect(res.body.customer.sites).toHaveLength(1);
    expect(res.body.customer.sites[0].addressJson.city).toBe("Hisar");
    createdCustomerIds.push(res.body.customer.id);
  });

  it("creates a customer with no site when address fields are incomplete", async () => {
    const res = await request(app)
      .post("/api/admin/customers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Phone Only Customer", phone: `+91900${suffix % 100000}2` });
    expect(res.status).toBe(201);
    expect(res.body.customer.sites).toHaveLength(0);
    createdCustomerIds.push(res.body.customer.id);
  });

  it("rejects a duplicate phone number", async () => {
    const phone = `+91900${suffix % 100000}3`;
    const first = await request(app)
      .post("/api/admin/customers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Dup Test One", phone });
    createdCustomerIds.push(first.body.customer.id);

    const second = await request(app)
      .post("/api/admin/customers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Dup Test Two", phone });
    expect(second.status).toBe(400);
  });

  it("rejects a customer with neither phone nor email", async () => {
    const res = await request(app)
      .post("/api/admin/customers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "No Contact Customer" });
    expect(res.status).toBe(400);
  });
});

describe("GET /admin/customers/export and /sample-csv", () => {
  it("exports customers as CSV with the expected header row", async () => {
    const res = await request(app).get("/api/admin/customers/export").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text.split("\r\n")[0]).toBe("Name,Phone,Email,City,Bookings,AMC Active,Joined");
  });

  it("returns a sample CSV with the documented columns and one example row", async () => {
    const res = await request(app).get("/api/admin/customers/sample-csv").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const lines = res.text.split("\r\n");
    expect(lines[0]).toBe("name,phone,email,city,address,plant_capacity_kw");
    expect(lines).toHaveLength(2);
  });
});

describe("POST /admin/customers/import (CSV bulk import)", () => {
  it("creates valid rows, skips a duplicate phone and an invalid row, and reports why", async () => {
    const dupPhone = `+91900${suffix % 100000}4`;
    const dup = await request(app)
      .post("/api/admin/customers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Existing Customer", phone: dupPhone });
    createdCustomerIds.push(dup.body.customer.id);

    const csv = [
      "name,phone,email,city,address,plant_capacity_kw",
      `New Import Customer,+91900${suffix % 100000}5,,Hisar,2 Import Rd,3`,
      `,+91900${suffix % 100000}6,,,,`, // missing name -> invalid
      `Duplicate Row Customer,${dupPhone},,,,`, // duplicate phone -> skipped
    ].join("\n");

    const res = await request(app)
      .post("/api/admin/customers/import")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(csv), { filename: "customers.csv", contentType: "text/csv" });

    expect(res.status).toBe(200);
    expect(res.body.created).toBe(1);
    expect(res.body.skipped).toHaveLength(2);
    expect(res.body.skipped.find((s) => s.row === 3).reason).toMatch(/name/i);
    expect(res.body.skipped.find((s) => s.row === 4).reason).toMatch(/already exists/i);

    const created = await prisma.user.findFirst({ where: { name: "New Import Customer" }, include: { sites: true } });
    expect(created).not.toBeNull();
    expect(created.sites).toHaveLength(1);
    createdCustomerIds.push(created.id);
  });

  it("rejects a request with no file", async () => {
    const res = await request(app).post("/api/admin/customers/import").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });
});
