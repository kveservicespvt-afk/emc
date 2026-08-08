// Central home for business rules that would otherwise be scattered as magic numbers.
// Section 5.9 wants pricing/config to eventually be admin-editable via the DB (Pass 2/3
// CMS); until that lands, this file is the single source of truth.

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",

  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  razorpayMockMode: process.env.RAZORPAY_MOCK_MODE !== "false",
  // Surfaces the generated OTP in the /api/auth/otp/request response (and the
  // login screen) so the flow is usable before a real SMS provider is wired up —
  // deliberately independent of NODE_ENV so it can be turned on for a live demo
  // deploy. Defaults OFF; must be explicitly set to "true". Turn off before
  // real customer launch.
  showDevOtp: process.env.SHOW_DEV_OTP === "true",

  // SOP business rules (Section 8)
  booking: {
    // No bookings between 11:00 and 15:00 (peak sun / safety window).
    blockedWindow: { startMinutes: 11 * 60, endMinutes: 15 * 60 },
    // Preferred slots offered in the UI.
    allowedSlots: [
      { label: "Morning (6 AM – 9 AM)", start: "06:00", end: "09:00" },
      { label: "Evening (4 PM – Sunset)", start: "16:00", end: "18:30" },
    ],
  },

  waterQuality: {
    tdsMaxPpm: 50,
    phMin: 6.5,
    phMax: 7.5,
    sprayPressureMaxBar: 1.5,
    waterTempMaxC: 40,
  },

  cleaningFrequencyDays: {
    highDust: { min: 7, max: 10 },
    moderateDust: { min: 14, max: 21 },
    lowDust: { min: 30, max: 45 },
    postDustStorm: { min: 1, max: 2, urgent: true },
  },

  prRatio: {
    // Expected improvement for medium soiling; ~0% improvement after a clean should
    // flag the booking for an O&M follow-up (possible shading/inverter/degradation issue).
    expectedImprovementMinPct: 3,
    expectedImprovementMaxPct: 5,
    followUpThresholdPct: 0.5,
  },
};
