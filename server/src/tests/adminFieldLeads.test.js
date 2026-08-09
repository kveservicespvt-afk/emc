import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";

const app = createApp();
const suffix = Date.now();
let adminToken;
let adminUserId;
let staffUserId;
const cleanupPhones = [];
const cleanupUserIds = [];

function phone(tag) {
  const p = `+9198${suffix % 1000000}${tag}`;
  cleanupPhones.push(p);
  return p;
}

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { name: "Field Leads Test Admin", email: `field-leads-admin-${suffix}@example.com`, role: "ADMIN", passwordHash: "x" },
  });
  adminUserId = admin.id;
  adminToken = signToken(admin);

  const staff = await prisma.user.create({
    data: { name: "Field Leads Test Staff", email: `field-leads-staff-${suffix}@example.com`, role: "STAFF", passwordHash: "x" },
  });
  staffUserId = staff.id;
});

afterAll(async () => {
  const leads = await prisma.fieldLead.findMany({ where: { phone: { in: cleanupPhones } } });
  const leadIds = leads.map((l) => l.id);
  await prisma.fieldLeadCallLog.deleteMany({ where: { fieldLeadId: { in: leadIds } } });
  await prisma.fieldLead.deleteMany({ where: { id: { in: leadIds } } });

  const subs = await prisma.subscription.findMany({ where: { user: { phone: { in: cleanupPhones } } } });
  const subIds = subs.map((s) => s.id);
  await prisma.booking.deleteMany({ where: { subscriptionId: { in: subIds } } });
  await prisma.subscription.deleteMany({ where: { id: { in: subIds } } });
  await prisma.site.deleteMany({ where: { user: { phone: { in: cleanupPhones } } } });
  await prisma.user.deleteMany({ where: { phone: { in: cleanupPhones } } });
  await prisma.user.deleteMany({ where: { id: { in: [...cleanupUserIds, adminUserId, staffUserId] } } });
  await prisma.$disconnect();
});

describe("create field lead", () => {
  it("creates a field lead", async () => {
    const p = phone("01");
    const res = await request(app)
      .post("/api/admin/field-leads")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ customerName: "Create Test Lead", phone: p, city: "Hisar", plantCapacityKw: 4 });
    expect(res.status).toBe(201);
    expect(res.body.fieldLead.callStatus).toBe("NOT_CALLED");
  });

  it("rejects a duplicate phone", async () => {
    const p = phone("02");
    await request(app).post("/api/admin/field-leads").set("Authorization", `Bearer ${adminToken}`).send({ customerName: "Dup A", phone: p });
    const res = await request(app).post("/api/admin/field-leads").set("Authorization", `Bearer ${adminToken}`).send({ customerName: "Dup B", phone: p });
    expect(res.status).toBe(400);
  });
});

describe("bulk import", () => {
  it("creates valid rows, skips a duplicate phone and an invalid row, and reports why", async () => {
    const existingPhone = phone("10");
    await request(app).post("/api/admin/field-leads").set("Authorization", `Bearer ${adminToken}`).send({ customerName: "Existing Import Lead", phone: existingPhone });

    const newPhone = phone("11");
    const badPhoneTag = phone("12"); // used only to keep numbering distinct; row itself is invalid (no name)
    const csv = [
      "house_number,customer_name,phone,address,city,plant_capacity_kw,number_of_panels",
      `7-B,New Import Lead,${newPhone},Near Temple,Hisar,3,8`,
      `,,${badPhoneTag},,,,`,
      `9-C,Duplicate Import Lead,${existingPhone},,,,`,
    ].join("\n");

    const res = await request(app)
      .post("/api/admin/field-leads/bulk-import")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(csv), { filename: "field-leads.csv", contentType: "text/csv" });

    expect(res.status).toBe(200);
    expect(res.body.created).toBe(1);
    expect(res.body.skipped).toHaveLength(2);
    expect(res.body.skipped.find((s) => s.row === 3).reason).toMatch(/customer_name/i);
    expect(res.body.skipped.find((s) => s.row === 4).reason).toMatch(/already exists/i);

    const created = await prisma.fieldLead.findUnique({ where: { phone: newPhone } });
    expect(created).not.toBeNull();
    expect(created.source).toBe("bulk_import");
    expect(created.numberOfPanels).toBe(8);
  });

  it("returns the documented sample CSV columns", async () => {
    const res = await request(app).get("/api/admin/field-leads/sample-csv").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.text.split("\r\n")[0]).toBe("house_number,customer_name,phone,address,city,plant_capacity_kw,number_of_panels");
  });
});

describe("list filters and sort", () => {
  let lowKwId, highKwId;

  beforeAll(async () => {
    const lowKwPhone = phone("20");
    const highKwPhone = phone("21");
    const low = await request(app)
      .post("/api/admin/field-leads")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ customerName: "Low Kw Lead", phone: lowKwPhone, city: "FilterCity", plantCapacityKw: 2, assignedToId: staffUserId });
    lowKwId = low.body.fieldLead.id;

    const high = await request(app)
      .post("/api/admin/field-leads")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ customerName: "High Kw Lead", phone: highKwPhone, city: "FilterCity", plantCapacityKw: 9 });
    highKwId = high.body.fieldLead.id;
  });

  it("filters by city", async () => {
    const res = await request(app).get("/api/admin/field-leads").query({ city: "FilterCity" }).set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.fieldLeads.map((f) => f.id)).toEqual(expect.arrayContaining([lowKwId, highKwId]));
  });

  it("filters by assignedToId", async () => {
    const res = await request(app).get("/api/admin/field-leads").query({ assignedToId: staffUserId }).set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.fieldLeads.some((f) => f.id === lowKwId)).toBe(true);
    expect(res.body.fieldLeads.some((f) => f.id === highKwId)).toBe(false);
  });

  it("defaults the view to pending (excludes nothing here since none are converted/lost yet, but view=converted excludes both)", async () => {
    const res = await request(app).get("/api/admin/field-leads").query({ city: "FilterCity", view: "converted" }).set("Authorization", `Bearer ${adminToken}`);
    expect(res.body.fieldLeads.some((f) => f.id === lowKwId)).toBe(false);
  });

  it("sorts by plantCapacityKw ascending", async () => {
    const res = await request(app)
      .get("/api/admin/field-leads")
      .query({ city: "FilterCity", sortBy: "plantCapacityKw", sortDir: "asc" })
      .set("Authorization", `Bearer ${adminToken}`);
    const ids = res.body.fieldLeads.map((f) => f.id);
    expect(ids.indexOf(lowKwId)).toBeLessThan(ids.indexOf(highKwId));
  });
});

describe("call log", () => {
  it("creates a call log entry and updates the parent lead's callStatus/lastCallDate", async () => {
    const p = phone("30");
    const create = await request(app).post("/api/admin/field-leads").set("Authorization", `Bearer ${adminToken}`).send({ customerName: "Call Log Lead", phone: p });
    const id = create.body.fieldLead.id;

    const followup = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await request(app)
      .post(`/api/admin/field-leads/${id}/call-log`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ remark: "Spoke to owner, interested", outcome: "CALLED_INTERESTED", nextFollowupDate: followup });

    expect(res.status).toBe(201);
    expect(res.body.callLog.outcome).toBe("CALLED_INTERESTED");
    expect(res.body.callLog.calledBy.id).toBe(adminUserId);
    expect(res.body.fieldLead.callStatus).toBe("CALLED_INTERESTED");
    expect(res.body.fieldLead.lastCallDate).not.toBeNull();

    const detail = await request(app).get(`/api/admin/field-leads/${id}`).set("Authorization", `Bearer ${adminToken}`);
    expect(detail.body.fieldLead.callLogs).toHaveLength(1);
  });

  it("appends multiple call log entries rather than overwriting", async () => {
    const p = phone("31");
    const create = await request(app).post("/api/admin/field-leads").set("Authorization", `Bearer ${adminToken}`).send({ customerName: "Multi Call Lead", phone: p });
    const id = create.body.fieldLead.id;

    await request(app).post(`/api/admin/field-leads/${id}/call-log`).set("Authorization", `Bearer ${adminToken}`).send({ outcome: "CALLED_NO_ANSWER" });
    await request(app).post(`/api/admin/field-leads/${id}/call-log`).set("Authorization", `Bearer ${adminToken}`).send({ outcome: "CALLED_INTERESTED" });

    const detail = await request(app).get(`/api/admin/field-leads/${id}`).set("Authorization", `Bearer ${adminToken}`);
    expect(detail.body.fieldLead.callLogs).toHaveLength(2);
    expect(detail.body.fieldLead.callLogs[0].outcome).toBe("CALLED_INTERESTED"); // most recent first
    expect(detail.body.fieldLead.callStatus).toBe("CALLED_INTERESTED");
  });
});

describe("stats", () => {
  it("counts overdue follow-ups (past nextFollowupDate, not converted/lost)", async () => {
    const p = phone("40");
    const create = await request(app).post("/api/admin/field-leads").set("Authorization", `Bearer ${adminToken}`).send({ customerName: "Overdue Lead", phone: p });
    const id = create.body.fieldLead.id;

    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await request(app)
      .post(`/api/admin/field-leads/${id}/call-log`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ outcome: "FOLLOWUP_SCHEDULED", nextFollowupDate: pastDate });

    const res = await request(app).get("/api/admin/field-leads/stats").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.overdueFollowups).toBeGreaterThanOrEqual(1);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.conversionRate).toBeGreaterThanOrEqual(0);
  });
});

describe("convert to AMC", () => {
  let quarterlyPlanId;

  beforeAll(async () => {
    const plan = await prisma.aMCPlan.findFirst({ where: { frequencyPerYear: 4, active: true } });
    quarterlyPlanId = plan.id;
  });

  it("converts a lead with a brand-new phone: creates a customer, site, and subscription with the full visit schedule", async () => {
    const p = phone("50");
    const create = await request(app)
      .post("/api/admin/field-leads")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ customerName: "Convert New Lead", phone: p, city: "ConvertCity", address: "1 Convert St", plantCapacityKw: 5, houseNumber: "5-Z" });
    const id = create.body.fieldLead.id;

    const res = await request(app)
      .post(`/api/admin/field-leads/${id}/convert`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ amcPlanId: quarterlyPlanId, startDate: "2027-09-01" });

    expect(res.status).toBe(201);
    expect(res.body.fieldLead.callStatus).toBe("CONVERTED");
    expect(res.body.fieldLead.convertedSubscriptionId).toBe(res.body.subscription.id);
    expect(res.body.customer.phone).toBe(p);
    cleanupUserIds.push(res.body.customer.id);

    const bookings = await prisma.booking.findMany({ where: { subscriptionId: res.body.subscription.id } });
    expect(bookings).toHaveLength(4); // quarterly plan: first visit + 3 future
  });

  it("converts a lead reusing an existing customer account by phone, without creating a duplicate", async () => {
    const p = phone("51");
    const existingCustomer = await prisma.user.create({ data: { name: "Pre-existing Customer", phone: p, role: "CUSTOMER" } });

    const create = await request(app)
      .post("/api/admin/field-leads")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ customerName: "Convert Existing Lead", phone: p, city: "ConvertCity", address: "2 Convert St", plantCapacityKw: 6 });
    const id = create.body.fieldLead.id;

    const res = await request(app)
      .post(`/api/admin/field-leads/${id}/convert`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ amcPlanId: quarterlyPlanId, startDate: "2027-09-01" });

    expect(res.status).toBe(201);
    expect(res.body.customer.id).toBe(existingCustomer.id);

    const usersWithPhone = await prisma.user.count({ where: { phone: p } });
    expect(usersWithPhone).toBe(1);
  });

  it("rejects converting an already-converted lead", async () => {
    const p = phone("52");
    const create = await request(app)
      .post("/api/admin/field-leads")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ customerName: "Double Convert Lead", phone: p, city: "ConvertCity", address: "3 Convert St", plantCapacityKw: 4 });
    const id = create.body.fieldLead.id;

    const first = await request(app)
      .post(`/api/admin/field-leads/${id}/convert`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ amcPlanId: quarterlyPlanId, startDate: "2027-09-01" });
    expect(first.status).toBe(201);
    cleanupUserIds.push(first.body.customer.id);

    const second = await request(app)
      .post(`/api/admin/field-leads/${id}/convert`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ amcPlanId: quarterlyPlanId, startDate: "2027-09-01" });
    expect(second.status).toBe(400);
  });
});

describe("staff listing", () => {
  it("lists ADMIN and STAFF users for the assignedTo dropdown", async () => {
    const res = await request(app).get("/api/admin/staff").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.staff.some((s) => s.id === staffUserId)).toBe(true);
    expect(res.body.staff.every((s) => ["ADMIN", "STAFF"].includes(s.role))).toBe(true);
  });
});
