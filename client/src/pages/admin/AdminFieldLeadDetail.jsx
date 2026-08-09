import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";
import { StatusChip } from "../../components/ui/StatusChip.jsx";

export function AdminFieldLeadDetail() {
  const { id } = useParams();

  const query = useQuery({
    queryKey: ["admin-field-lead", id],
    queryFn: () => adminApi.get(`/admin/field-leads/${id}`).then((r) => r.data.fieldLead),
  });

  return (
    <div>
      <Link to="/admin/field-leads" className="text-sm text-gray-500 hover:text-forest">&larr; Back to Field Leads</Link>

      <div className="mt-4">
        <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error} onRetry={query.refetch}>
          {query.data && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-ink">{query.data.customerName}</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      {query.data.houseNumber ? `House ${query.data.houseNumber} · ` : ""}{query.data.phone}
                    </p>
                    <p className="text-sm text-gray-500">
                      {[query.data.address, query.data.city].filter(Boolean).join(", ") || "No address on file"}
                    </p>
                  </div>
                  <StatusChip status={query.data.callStatus} />
                </div>

                <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs uppercase text-gray-400">Plant Capacity</dt>
                    <dd className="font-medium text-ink">{query.data.plantCapacityKw ? `${query.data.plantCapacityKw} kW` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-gray-400">Panels</dt>
                    <dd className="font-medium text-ink">{query.data.numberOfPanels ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-gray-400">Source</dt>
                    <dd className="font-medium text-ink">{query.data.source}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-gray-400">Assigned To</dt>
                    <dd className="font-medium text-ink">{query.data.assignedTo?.name ?? "Unassigned"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-gray-400">Last Call</dt>
                    <dd className="font-medium text-ink">
                      {query.data.lastCallDate ? new Date(query.data.lastCallDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-gray-400">Next Follow-up</dt>
                    <dd className="font-medium text-ink">
                      {query.data.nextFollowupDate ? new Date(query.data.nextFollowupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </AsyncState>
      </div>
    </div>
  );
}
