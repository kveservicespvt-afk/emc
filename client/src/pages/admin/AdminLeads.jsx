import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";
import { StatusChip } from "../../components/ui/StatusChip.jsx";

const LEAD_TYPES = ["GENERAL", "SCHEME_ASSISTANCE", "REPAIR_REQUEST", "WARRANTY_WAITLIST", "COMMERCIAL_QUOTE"];
const LEAD_STATUSES = ["NEW", "CONTACTED", "CONVERTED", "LOST"];

export function AdminLeads() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [leadType, setLeadType] = useState("");
  const [status, setStatus] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const query = useQuery({
    queryKey: ["admin-leads", search, leadType, status],
    queryFn: () =>
      adminApi
        .get("/admin/leads", { params: { search: search || undefined, leadType: leadType || undefined, status: status || undefined } })
        .then((r) => r.data.leads),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status: newStatus }) => adminApi.patch(`/admin/leads/${id}`, { status: newStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-leads"] }),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Leads</h1>

      <div className="card mt-6 flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input max-w-xs" value={leadType} onChange={(e) => setLeadType(e.target.value)}>
          <option value="">All lead types</option>
          {LEAD_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card mt-6">
        <AsyncState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          onRetry={query.refetch}
          isEmpty={query.data?.length === 0}
          emptyMessage="No leads match these filters."
        >
          <div className="divide-y divide-gray-50">
            {query.data?.map((lead) => (
              <div key={lead.id} className="py-3">
                <button
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-ink">{lead.name}</span>
                    <span className="text-sm text-gray-500">{lead.phone}</span>
                    <StatusChip status={lead.leadType} />
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusChip status={lead.status} />
                    <span className="text-xs text-gray-400">{new Date(lead.createdAt).toLocaleDateString("en-IN")}</span>
                    <span className="text-gray-400">{expandedId === lead.id ? "−" : "+"}</span>
                  </div>
                </button>

                {expandedId === lead.id && (
                  <div className="mt-3 grid grid-cols-1 gap-4 rounded-lg bg-offwhite p-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase text-gray-400">City</p>
                      <p className="font-medium text-ink">{lead.city ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-400">Plant Capacity</p>
                      <p className="font-medium text-ink">{lead.plantCapacityKw ? `${lead.plantCapacityKw} kW` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-400">Source</p>
                      <p className="font-medium text-ink">{lead.source}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-400">Assigned To</p>
                      <p className="font-medium text-ink">{lead.assignedTo?.name ?? "Unassigned"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs uppercase text-gray-400">Message</p>
                      <p className="font-medium text-ink">{lead.message || "—"}</p>
                    </div>
                    <div>
                      <label className="label">Update Status</label>
                      <select
                        className="input"
                        value={lead.status}
                        onChange={(e) => statusMutation.mutate({ id: lead.id, status: e.target.value })}
                      >
                        {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </AsyncState>
      </div>
    </div>
  );
}
