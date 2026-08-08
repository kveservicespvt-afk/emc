// Auto-generates the rest of a year's AMC visit dates once a subscription starts,
// per Section 5.6 (Quarterly = 4/yr, Monthly = 12/yr). The first visit is booked
// directly by the customer; this fills in the remaining N-1 for the year ahead,
// spaced evenly, reusing the same slot as the first visit.
export function generateFutureVisitDates(firstVisitDate, frequencyPerYear, slotStart, slotEnd) {
  if (frequencyPerYear <= 1) return [];
  const intervalDays = Math.round(365 / frequencyPerYear);
  const dates = [];
  for (let i = 1; i < frequencyPerYear; i++) {
    const d = new Date(firstVisitDate);
    d.setDate(d.getDate() + intervalDays * i);
    dates.push({ scheduledDate: d, slotStart, slotEnd });
  }
  return dates;
}
