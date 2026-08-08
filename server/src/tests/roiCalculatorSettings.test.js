import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { estimateSavings } from "../lib/roiCalculator.js";

const app = createApp();

describe("estimateSavings", () => {
  it("uses the default loss-pct map when none is passed", () => {
    const result = estimateSavings({ plantCapacityKw: 5, avgMonthlyBill: 3000, dustZone: "HIGH" });
    expect(result.recoverableLossPct).toBe(20);
  });

  it("honors a custom loss-pct map", () => {
    const result = estimateSavings(
      { plantCapacityKw: 5, avgMonthlyBill: 3000, dustZone: "HIGH" },
      { HIGH: 0.5, MODERATE: 0.3, LOW: 0.1 }
    );
    expect(result.recoverableLossPct).toBe(50);
    expect(result.monthlySavings).toBe(1500);
  });
});

describe("POST /api/roi-calculator reflects admin-edited SiteSettings", () => {
  afterEach(async () => {
    // Restore defaults so other tests/live use aren't affected.
    await prisma.siteSettings.update({
      where: { id: "singleton" },
      data: { roiHighZoneLossPct: 0.2, roiModerateZoneLossPct: 0.12, roiLowZoneLossPct: 0.06 },
    });
  });

  it("returns a result computed from the current SiteSettings values", async () => {
    await prisma.siteSettings.update({ where: { id: "singleton" }, data: { roiHighZoneLossPct: 0.35 } });

    const res = await request(app)
      .post("/api/roi-calculator")
      .send({ plantCapacityKw: 5, avgMonthlyBill: 2000, dustZone: "HIGH" });

    expect(res.status).toBe(200);
    expect(res.body.recoverableLossPct).toBe(35);
    expect(res.body.monthlySavings).toBe(700);
  });
});
