import { config } from "../config.js";

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Returns true if the [start, end) window overlaps the SOP-blocked 11:00–15:00
// peak-sun/safety window (Section 8). Pure function — no I/O, easy to unit test.
export function overlapsBlockedWindow(start, end) {
  const { startMinutes, endMinutes } = config.booking.blockedWindow;
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (e <= s) return true; // malformed range — reject rather than silently accept
  return s < endMinutes && e > startMinutes;
}

export function assertSlotAllowed(start, end) {
  if (overlapsBlockedWindow(start, end)) {
    throw new Error(
      `Slot ${start}-${end} falls inside the blocked 11:00 AM–3:00 PM window. Choose a morning (6–9 AM) or evening (4 PM–sunset) slot.`
    );
  }
}

export function listAllowedSlots() {
  return config.booking.allowedSlots;
}
