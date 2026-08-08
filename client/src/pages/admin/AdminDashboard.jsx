import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";
import { useAdminAuth } from "../../hooks/useAdminAuth.jsx";

const CARDS = [
  { key: "bookingsToday", label: "Bookings Today" },
  { key: "pendingAssignments", label: "Pending Technician Assignment" },
  { key: "activeAmcSubs", label: "Active AMC Subscriptions" },
  { key: "liveCities", label: "Live Cities" },
  { key: "newLeads", label: "New Leads" },
  { key: "totalBookings", label: "Total Bookings (All Time)" },
];

export function AdminDashboard() {
  const { admin } = useAdminAuth();
  const query = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: () => adminApi.get("/admin/dashboard-stats").then((r) => r.data),
  });

  const needsAttentionQuery = useQuery({
    queryKey: ["admin-needs-attention"],
    queryFn: () => adminApi.get("/admin/dashboard-stats/needs-attention").then((r) => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Welcome back, {admin.name.split(" ")[0]}</h1>
      <p className="mt-1 text-gray-500">Here's what's happening across EaseMyClean today.</p>

      <div className="mt-8">
        <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error} onRetry={query.refetch}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CARDS.map((c) => (
              <div key={c.key} className="card">
                <p className="text-xs font-semibold uppercase text-gray-400">{c.label}</p>
                <p className="mt-2 text-3xl font-extrabold text-forest">{query.data?.[c.key] ?? "—"}</p>
              </div>
            ))}
          </div>
        </AsyncState>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-bold text-ink">Needs Attention</h2>
        <div className="mt-4">
          <AsyncState
            isLoading={needsAttentionQuery.isLoading}
            isError={needsAttentionQuery.isError}
            error={needsAttentionQuery.error}
            onRetry={needsAttentionQuery.refetch}
          >
            {needsAttentionQuery.data && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <AttentionSection
                  title="Unassigned Bookings"
                  emptyMessage="Every booking has a technician assigned."
                  items={needsAttentionQuery.data.unassignedBookings.map((b) => ({
                    key: b.id,
                    to: `/admin/bookings/${b.id}`,
                    primary: b.user?.name,
                    secondary: `${b.service?.name || b.amcPlan?.name || "Booking"} · ${new Date(b.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
                  }))}
                />
                <AttentionSection
                  title="New Leads (Not Yet Contacted)"
                  emptyMessage="No new leads waiting on a first contact."
                  items={needsAttentionQuery.data.newLeads.map((l) => ({
                    key: l.id,
                    to: l.leadType === "COMMERCIAL_QUOTE" ? "/admin/commercial-queries" : "/admin/general-queries",
                    primary: l.name,
                    secondary: `${l.leadType.replace(/_/g, " ")} · ${l.phone}`,
                  }))}
                />
                <AttentionSection
                  title="Payment Issues"
                  emptyMessage="No failed or stuck-pending payments."
                  items={needsAttentionQuery.data.paymentIssues.map((p) => ({
                    key: p.id,
                    to: "/admin/payments",
                    primary: p.booking?.user?.name ?? "Unknown customer",
                    secondary: `₹${p.amount.toLocaleString("en-IN")} · ${p.status}`,
                  }))}
                />
              </div>
            )}
          </AsyncState>
        </div>
      </div>
    </div>
  );
}

function AttentionSection({ title, items, emptyMessage }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-ink">{title}</h3>
        {items.length > 0 && (
          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-gold px-1.5 text-xs font-bold text-ink">
            {items.length}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.key}>
              <Link to={item.to} className="block rounded-lg p-2 -mx-2 text-sm hover:bg-offwhite">
                <p className="font-medium text-ink">{item.primary}</p>
                <p className="text-gray-500">{item.secondary}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
