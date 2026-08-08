import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

const app = createApp();
const testEmail = `city-validation-${Date.now()}@example.com`;
let token;
let liveCityId;
let upcomingCityId;
let createdSiteId;

beforeAll(async () => {
  const registerRes = await request(app)
    .post("/api/auth/register")
    .send({ name: "City Test User", email: testEmail, password: "password123" });
  token = registerRes.body.token;

  const live = await prisma.city.create({
    data: { name: `LiveCity${Date.now()}`, state: "TestState", status: "LIVE", dustZone: "HIGH" },
  });
  liveCityId = live.id;

  const upcoming = await prisma.city.create({
    data: { name: `UpcomingCity${Date.now()}`, state: "TestState", status: "UPCOMING", dustZone: "MODERATE" },
  });
  upcomingCityId = upcoming.id;
});

afterAll(async () => {
  if (createdSiteId) await prisma.site.deleteMany({ where: { id: createdSiteId } });
  await prisma.city.deleteMany({ where: { id: { in: [liveCityId, upcomingCityId] } } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.$disconnect();
});

describe("site creation city validation", () => {
  it("rejects a site in a city that isn't LIVE", async () => {
    const city = await prisma.city.findUnique({ where: { id: upcomingCityId } });
    const res = await request(app)
      .post("/api/sites")
      .set("Authorization", `Bearer ${token}`)
      .send({
        label: "Upcoming City Site",
        addressJson: { line1: "1 Test St", city: city.name, state: "TestState", pincode: "000000" },
        plantCapacityKw: 4,
      });
    expect(res.status).toBe(400);
  });

  it("accepts a site in a LIVE city", async () => {
    const city = await prisma.city.findUnique({ where: { id: liveCityId } });
    const res = await request(app)
      .post("/api/sites")
      .set("Authorization", `Bearer ${token}`)
      .send({
        label: "Live City Site",
        addressJson: { line1: "1 Test St", city: city.name, state: "TestState", pincode: "000000" },
        plantCapacityKw: 4,
      });
    expect(res.status).toBe(201);
    createdSiteId = res.body.site.id;
  });
});
