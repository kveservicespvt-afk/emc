// Minimal CSV serializer — no external dependency needed for the handful of
// admin export screens (Payments, Reports). Quotes any value containing a
// comma, quote, or newline per RFC 4180.
function escapeCell(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(columns, rows) {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(","));
  return [header, ...lines].join("\r\n");
}
