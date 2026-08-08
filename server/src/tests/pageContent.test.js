import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";

const app = createApp();
const slug = `test-page-${Date.now()}`;
let adminToken;
let adminUserId;

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { name: "PageContent Test Admin", email: `pagecontent-admin-${Date.now()}@example.com`, role: "ADMIN", passwordHash: "x" },
  });
  adminUserId = admin.id;
  adminToken = signToken(admin);
});

afterAll(async () => {
  await prisma.pageContent.deleteMany({ where: { id: slug } });
  await prisma.user.deleteMany({ where: { id: adminUserId } });
  await prisma.$disconnect();
});

describe("page content CMS", () => {
  it("returns null for a page that hasn't been configured yet", async () => {
    const res = await request(app).get(`/api/page-content/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.page).toBeNull();
  });

  it("upserts on first save and updates on second save", async () => {
    const create = await request(app)
      .patch(`/api/admin/page-content/${slug}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ contentJson: { hero: "First version" } });
    expect(create.status).toBe(200);
    expect(create.body.page.contentJson.hero).toBe("First version");

    const update = await request(app)
      .patch(`/api/admin/page-content/${slug}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ contentJson: { hero: "Second version" } });
    expect(update.status).toBe(200);
    expect(update.body.page.contentJson.hero).toBe("Second version");

    const publicRes = await request(app).get(`/api/page-content/${slug}`);
    expect(publicRes.body.page.contentJson.hero).toBe("Second version");
  });
});
