import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

const app = createApp();
const adminEmail = `role-gate-admin-${Date.now()}@example.com`;
const customerEmail = `role-gate-customer-${Date.now()}@example.com`;
const password = "password123";

beforeAll(async () => {
  await prisma.user.create({
    data: {
      name: "Role Gate Admin",
      email: adminEmail,
      passwordHash: await bcrypt.hash(password, 10),
      role: "ADMIN",
    },
  });
  await prisma.user.create({
    data: {
      name: "Role Gate Customer",
      email: customerEmail,
      passwordHash: await bcrypt.hash(password, 10),
      role: "CUSTOMER",
    },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [adminEmail, customerEmail] } } });
  await prisma.$disconnect();
});

describe("role-gated login endpoints", () => {
  it("rejects admin credentials on the customer /api/auth/login endpoint", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: adminEmail, password });
    expect(res.status).toBe(401);
  });

  it("accepts admin credentials on /api/auth/admin-login", async () => {
    const res = await request(app).post("/api/auth/admin-login").send({ email: adminEmail, password });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("ADMIN");
  });

  it("rejects customer credentials on /api/auth/admin-login", async () => {
    const res = await request(app).post("/api/auth/admin-login").send({ email: customerEmail, password });
    expect(res.status).toBe(401);
  });

  it("accepts customer credentials on the customer /api/auth/login endpoint", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: customerEmail, password });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("CUSTOMER");
  });
});
