import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { AsyncState } from "../ui/AsyncState.jsx";
import { StatusChip } from "../ui/StatusChip.jsx";
import { NotesPanel } from "./NotesPanel.jsx";

const LEAD_STATUSES = ["NEW", "CONTACTED", "CONVERTED", "LOST"];

// Shared list view for General Queries and Commercial Queries — same shape,
// filtered to a fixed leadType so the two admin sections stay genuinely
// separate screens (per the user's explicit ask) while sharing one implementation.
export function LeadsListView({ leadType, showPlantCapacity }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const query = useQuery({
    queryKey: ["admin-leads", leadType, search, status, city, from, to],
    queryFn: () =>
      adminApi
        .get("/admin/leads", {
          params: {
            leadType,
            search: search || undefined,
            status: status || undefined,
            city: city || undefined,
            from: from || undefined,
            to: to || undefined,
          },
        })
        .then((r) => r.data.leads),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status: newStatus }) => adminApi.patch(`/admin/leads/${id}`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-badge-counts"] });
    },
  });

  return (
    <div>
      <div className="card flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        <input className="input max-w-xs" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">From</label>
          <input type="date" className="input max-w-[10rem]" value={from} onChange={(e) => setFrom(e.target.value)} />
          <label className="text-xs text-gray-500">To</label>
          <input type="date" className="input max-w-[10rem]" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="card mt-6">
        <AsyncState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          onRetry={query.refetch}
          isEmpty={query.data?.length === 0}
          emptyMessage="No queries match these filters."
        >
          <div className="divide-y divide-gray-50">
            {query.data?.map((lead) => (
              <div key={lead.id} className="py-3">
                <button
                  className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
                  onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-ink">{lead.name}</span>
                    <span className="text-sm text-gray-500">{lead.phone}</span>
                    {lead.city && <span className="text-sm text-gray-400">· {lead.city}</span>}
                    {showPlantCapacity && lead.plantCapacityKw && (
                      <span className="text-sm text-gray-400">· {lead.plantCapacityKw} kW</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusChip status={lead.status} />
                    <span className="text-xs text-gray-400">{new Date(lead.createdAt).toLocaleDateString("en-IN")}</span>
                    <span className="text-gray-400">{expandedId === lead.id ? "−" : "+"}</span>
                  </div>
                </button>

                {expandedId === lead.id && (
                  <div className="mt-3 space-y-4 rounded-lg bg-offwhite p-4">
                    <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase text-gray-400">City</p>
                        <p className="font-medium text-ink">{lead.city ?? "—"}</p>
                      </div>
                      {showPlantCapacity && (
                        <div>
                          <p className="text-xs uppercase text-gray-400">Plant Capacity</p>
                          <p className="font-medium text-ink">{lead.plantCapacityKw ? `${lead.plantCapacityKw} kW` : "—"}</p>
                        </div>
                      )}
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

                    <div className="border-t border-gray-200 pt-4">
                      <NotesPanel entityType="LEAD" entityId={lead.id} />
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
