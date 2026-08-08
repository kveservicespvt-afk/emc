// Server-side price calculation. Per Section 5B: never trust a client-sent amount —
// this is the only place a booking price is computed, from a Service/AMCPlan record
// fetched from the DB plus the site's plant capacity.
export function calculatePrice({ basePrice, pricePerKw, plantCapacityKw }) {
  if (plantCapacityKw <= 0) {
    throw new Error("plantCapacityKw must be greater than 0");
  }
  const amount = basePrice + pricePerKw * plantCapacityKw;
  return Math.round(amount * 100) / 100;
}
