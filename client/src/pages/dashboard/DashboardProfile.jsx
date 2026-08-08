import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";
import { useAuth } from "../../hooks/useAuth.jsx";

export function DashboardProfile() {
  const { user } = useAuth();
  const sitesQuery = useQuery({ queryKey: ["sites"], queryFn: () => api.get("/sites").then((r) => r.data.sites) });

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-bold text-ink">My Profile</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-gray-400">Name</dt>
            <dd className="font-medium text-ink">{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-400">Phone</dt>
            <dd className="font-medium text-ink">{user.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-400">Email</dt>
            <dd className="font-medium text-ink">{user.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-400">Referral Code</dt>
            <dd className="font-medium text-ink">{user.referralCode}</dd>
          </div>
        </dl>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold text-ink">My Sites</h2>
        <div className="mt-4">
          <AsyncState
            isLoading={sitesQuery.isLoading}
            isError={sitesQuery.isError}
            error={sitesQuery.error}
            onRetry={sitesQuery.refetch}
            isEmpty={sitesQuery.data?.length === 0}
            emptyMessage="No sites saved yet — add one the next time you book a service."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {sitesQuery.data?.map((site) => (
                <div key={site.id} className="rounded-lg border border-gray-100 p-4">
                  <p className="font-semibold text-ink">{site.label}</p>
                  <p className="text-sm text-gray-500">{site.plantCapacityKw} kW · {site.mountType}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {site.addressJson?.line1}, {site.addressJson?.city}, {site.addressJson?.state} {site.addressJson?.pincode}
                  </p>
                </div>
              ))}
            </div>
          </AsyncState>
        </div>
      </div>
    </div>
  );
}
