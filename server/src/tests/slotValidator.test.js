import { describe, it, expect } from "vitest";
import { overlapsBlockedWindow, assertSlotAllowed } from "../lib/slotValidator.js";

describe("overlapsBlockedWindow", () => {
  it("blocks a slot fully inside 11:00-15:00", () => {
    expect(overlapsBlockedWindow("12:00", "13:00")).toBe(true);
  });

  it("blocks a slot that starts before and ends inside the window", () => {
    expect(overlapsBlockedWindow("10:30", "11:30")).toBe(true);
  });

  it("blocks a slot that starts inside and ends after the window", () => {
    expect(overlapsBlockedWindow("14:30", "16:00")).toBe(true);
  });

  it("allows the morning slot", () => {
    expect(overlapsBlockedWindow("06:00", "09:00")).toBe(false);
  });

  it("allows the evening slot", () => {
    expect(overlapsBlockedWindow("16:00", "18:30")).toBe(false);
  });

  it("allows a slot ending exactly at 11:00", () => {
    expect(overlapsBlockedWindow("09:30", "11:00")).toBe(false);
  });

  it("allows a slot starting exactly at 15:00", () => {
    expect(overlapsBlockedWindow("15:00", "16:00")).toBe(false);
  });

  it("rejects a malformed (end before start) range", () => {
    expect(overlapsBlockedWindow("10:00", "09:00")).toBe(true);
  });
});

describe("assertSlotAllowed", () => {
  it("throws for a blocked slot", () => {
    expect(() => assertSlotAllowed("12:00", "13:00")).toThrow(/blocked/i);
  });

  it("does not throw for an allowed slot", () => {
    expect(() => assertSlotAllowed("06:00", "09:00")).not.toThrow();
  });
});
