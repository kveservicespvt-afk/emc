import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";
import { StatusChip } from "../../components/ui/StatusChip.jsx";

export function DashboardAmc() {
  const query = useQuery({ queryKey: ["subscriptions-me"], queryFn: () => api.get("/subscriptions/me").then((r) => r.data.subscriptions) });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">My AMC Plans</h2>
        <Link to="/amc-plans" className="btn-secondary text-sm">Browse Plans</Link>
      </div>

      <AsyncState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        onRetry={query.refetch}
        isEmpty={query.data?.length === 0}
        emptyMessage="No active AMC plan. Subscribe to a plan for hassle-free recurring cleaning."
      >
        <div className="space-y-4">
          {query.data?.map((sub) => (
            <div key={sub.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-ink">{sub.amcPlan.name}</h3>
                  <p className="text-sm text-gray-500">{sub.site.label} · {sub.amcPlan.frequencyPerYear}x/year</p>
                </div>
                <StatusChip status={sub.status} />
              </div>
              <p className="mt-3 text-sm text-gray-600">
                Renews on {new Date(sub.renewalDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p className="mt-4 text-xs font-semibold uppercase text-gray-400">Scheduled visits</p>
              <ul className="mt-2 space-y-1 text-sm">
                {sub.bookings.map((b) => (
                  <li key={b.id} className="flex justify-between border-b border-gray-50 py-1.5">
                    <span>{new Date(b.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    <StatusChip status={b.status} />
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-gray-400">
                Plan upgrades/cancellation are managed by our support team for now — chat with us on WhatsApp.
              </p>
            </div>
          ))}
        </div>
      </AsyncState>
    </div>
  );
}
