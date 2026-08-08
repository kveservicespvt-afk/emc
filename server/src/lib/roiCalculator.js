// Rough savings estimator for the homepage ROI widget. Not a precision generation
// model — it's a lead-gen tool, so the formula favors being simple and explainable
// over rigorous. ASSUMPTION (flagged for the client to confirm/refine): recoverable
// soiling loss by dust zone is estimated from typical Indian rooftop soiling studies.
const RECOVERABLE_LOSS_PCT = {
  HIGH: 0.2,
  MODERATE: 0.12,
  LOW: 0.06,
};

export function estimateSavings({ plantCapacityKw, avgMonthlyBill, dustZone }) {
  const pct = RECOVERABLE_LOSS_PCT[dustZone];
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
