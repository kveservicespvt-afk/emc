// Rough savings estimator for the homepage ROI widget. Not a precision generation
// model — it's a lead-gen tool, so the formula favors being simple and explainable
// over rigorous. ASSUMPTION (flagged for the client to confirm/refine): recoverable
// soiling loss by dust zone is estimated from typical Indian rooftop soiling studies.
// The loss-pct-by-zone map is admin-editable (SiteSettings.roi*ZoneLossPct) — this
// constant is only the defensive fallback if that lookup is ever missing.
const DEFAULT_RECOVERABLE_LOSS_PCT = {
  HIGH: 0.2,
  MODERATE: 0.12,
  LOW: 0.06,
};

export function estimateSavings({ plantCapacityKw, avgMonthlyBill, dustZone }, lossPctByZone = DEFAULT_RECOVERABLE_LOSS_PCT) {
  const pct = lossPctByZone[dustZone];
  if (pct === undefined) {
    throw new Error("dustZone must be one of HIGH, MODERATE, LOW");
  }
  if (plantCapacityKw <= 0 || avgMonthlyBill < 0) {
    throw new Error("plantCapacityKw and avgMonthlyBill must be positive");
  }

  const monthlySavings = Math.round(avgMonthlyBill * pct);
  const annualSavings = monthlySavings * 12;

  return {
    recoverableLossPct: Math.round(pct * 100),
    monthlySavings,
    annualSavings,
  };
}
