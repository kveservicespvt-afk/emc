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
    </div>
  );
}
