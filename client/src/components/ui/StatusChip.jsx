const STYLES = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-700",
  TECHNICIAN_ASSIGNED: "bg-indigo-100 text-indigo-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-forest/10 text-forest",
  CANCELLED: "bg-red-100 text-red-700",
  SUCCESSFUL: "bg-forest/10 text-forest",
  PROCESSED: "bg-blue-100 text-blue-700",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-gray-100 text-gray-600",
  PUBLISHED: "bg-forest/10 text-forest",
  DRAFT: "bg-gray-100 text-gray-600",
  LIVE: "bg-forest/10 text-forest",
  ACTIVE: "bg-forest/10 text-forest",
  EXPIRED: "bg-gray-100 text-gray-600",
  // Lead types
  GENERAL: "bg-gray-100 text-gray-600",
  SCHEME_ASSISTANCE: "bg-sky/10 text-sky-dark",
  REPAIR_REQUEST: "bg-red-100 text-red-700",
  WARRANTY_WAITLIST: "bg-indigo-100 text-indigo-700",
  COMMERCIAL_QUOTE: "bg-gold/20 text-maroon",
  // Lead statuses
  NEW: "bg-sky/10 text-sky-dark",
  CONTACTED: "bg-gold/20 text-maroon",
  CONVERTED: "bg-forest/10 text-forest",
  LOST: "bg-gray-100 text-gray-600",
  // Customer-facing service report availability
  REPORT_READY: "bg-forest/10 text-forest",
  REPORT_PENDING: "bg-gray-100 text-gray-600",
  // Field lead call status (CONVERTED/LOST reuse the Lead-status colors above)
  NOT_CALLED: "bg-gray-100 text-gray-600",
  CALLED_NO_ANSWER: "bg-yellow-100 text-yellow-800",
  CALLED_INTERESTED: "bg-sky/10 text-sky-dark",
  CALLED_NOT_INTERESTED: "bg-red-100 text-red-700",
  FOLLOWUP_SCHEDULED: "bg-gold/20 text-maroon",
};

export function StatusChip({ status }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STYLES[status] || "bg-gray-100 text-gray-600"}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}
