import { describe, it, expect } from "vitest";
import { calculatePrice } from "../lib/pricing.js";

describe("calculatePrice", () => {
  it("computes basePrice + pricePerKw * capacity", () => {
    expect(calculatePrice({ basePrice: 499, pricePerKw: 50, plantCapacityKw: 5 })).toBe(749);
  });

  it("rounds to 2 decimal places", () => {
    expect(calculatePrice({ basePrice: 100, pricePerKw: 33.333, plantCapacityKw: 3 })).toBe(200);
  });

  it("throws for zero or negative capacity", () => {
    expect(() => calculatePrice({ basePrice: 100, pricePerKw: 10, plantCapacityKw: 0 })).toThrow();
    expect(() => calculatePrice({ basePrice: 100, pricePerKw: 10, plantCapacityKw: -2 })).toThrow();
  });
});
