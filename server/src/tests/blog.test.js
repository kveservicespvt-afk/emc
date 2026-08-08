import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";

const app = createApp();
let adminToken;
let adminUserId;
const postIds = [];

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { name: "Blog Test Admin", email: `blog-admin-${Date.now()}@example.com`, role: "ADMIN", passwordHash: "x" },
  });
  adminUserId = admin.id;
  adminToken = signToken(admin);
});

afterAll(async () => {
  await prisma.blogPost.deleteMany({ where: { id: { in: postIds } } });
  await prisma.user.deleteMany({ where: { id: adminUserId } });
  await prisma.$disconnect();
});

describe("blog module", () => {
  it("auto-generates a slug and avoids collisions", async () => {
    const first = await request(app)
      .post("/api/admin/blog")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Test Blog Slug Collision", content: "first" });
    expect(first.status).toBe(201);
    postIds.push(first.body.post.id);

    const second = await request(app)
      .post("/api/admin/blog")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Test Blog Slug Collision", content: "second" });
    expect(second.status).toBe(201);
    postIds.push(second.body.post.id);

    expect(first.body.post.slug).not.toBe(second.body.post.slug);
    expect(second.body.post.slug).toBe(`${first.body.post.slug}-2`);
  });

  it("hides drafts from the public endpoint but shows them on the admin endpoint", async () => {
    const draft = await request(app)
      .post("/api/admin/blog")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Draft Only Post", content: "draft body", status: "DRAFT" });
    postIds.push(draft.body.post.id);

    const publicRes = await request(app).get(`/api/blog/${draft.body.post.slug}`);
    expect(publicRes.status).toBe(404);

    const adminRes = await request(app)
      .get(`/api/admin/blog/${draft.body.post.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.post.status).toBe("DRAFT");
  });

  it("shows published posts on the public endpoint and lists them", async () => {
    const published = await request(app)
      .post("/api/admin/blog")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Published Test Post", content: "published body", status: "PUBLISHED" });
    postIds.push(published.body.post.id);
    expect(published.body.post.publishedAt).not.toBeNull();

    const publicRes = await request(app).get(`/api/blog/${published.body.post.slug}`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.post.title).toBe("Published Test Post");

    const listRes = await request(app).get("/api/blog");
    expect(listRes.status).toBe(200);
    expect(listRes.body.posts.some((p) => p.slug === published.body.post.slug)).toBe(true);
  });
});
