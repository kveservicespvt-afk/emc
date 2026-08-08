import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { apiErrorMessage, resolveMediaUrl } from "../../api/client.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";
import { StatusChip } from "../../components/ui/StatusChip.jsx";
import { NotesPanel } from "../../components/admin/NotesPanel.jsx";

const STATUSES = ["PENDING", "CONFIRMED", "TECHNICIAN_ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

function includesToLines(json) {
  return Object.entries(json ?? {}).map(([k, v]) => `${k}: ${v}`).join("\n");
}
function linesToIncludes(text) {
  const entries = text
    .split("\n")
    .map((line) => line.split(":"))
    .filter((parts) => parts.length >= 2 && parts[0].trim())
    .map(([key, ...rest]) => [key.trim(), rest.join(":").trim()]);
  return Object.fromEntries(entries);
}

const emptyReport = {
  dcIsolationConfirmed: false,
  cleaningMethod: "WET",
  waterTds: "",
  waterPh: "",
  areaCleanedSqm: "",
  waterUsedL: "",
  prePrRatio: "",
  postPrRatio: "",
  improvementPct: "",
  electricalChecks: "",
  featuredOnHomepage: false,
};

export function AdminBookingDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-booking", id],
    queryFn: () => adminApi.get(`/admin/bookings/${id}`).then((r) => r.data.booking),
  });

  const technicianQuery = useQuery({
    queryKey: ["admin-technicians"],
    queryFn: () => adminApi.get("/admin/technicians").then((r) => r.data.technicians),
  });

  const [status, setStatus] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [report, setReport] = useState(emptyReport);
  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);

  useEffect(() => {
    if (!query.data) return;
    setStatus(query.data.status);
    setTechnicianId(query.data.technicianId ?? "");
    if (query.data.serviceReport) {
      const r = query.data.serviceReport;
      setReport({
        dcIsolationConfirmed: r.dcIsolationConfirmed ?? false,
        cleaningMethod: r.cleaningMethod ?? "WET",
        waterTds: r.waterTds ?? "",
        waterPh: r.waterPh ?? "",
        areaCleanedSqm: r.areaCleanedSqm ?? "",
        waterUsedL: r.waterUsedL ?? "",
        prePrRatio: r.prePrRatio ?? "",
        postPrRatio: r.postPrRatio ?? "",
        improvementPct: r.improvementPct ?? "",
        electricalChecks: includesToLines(r.electricalChecksJson),
        featuredOnHomepage: r.featuredOnHomepage ?? false,
      });
    }
  }, [query.data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-booking", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["admin-badge-counts"] });
  };

  const statusMutation = useMutation({
    mutationFn: () =>
      adminApi.patch(`/bookings/${id}/status`, { status, ...(technicianId ? { technicianId } : {}) }),
    onSuccess: invalidate,
  });

  const reportMutation = useMutation({
    mutationFn: (publish) =>
      adminApi.put(`/admin/bookings/${id}/report`, {
        dcIsolationConfirmed: report.dcIsolationConfirmed,
        cleaningMethod: report.cleaningMethod,
        waterTds: report.waterTds || undefined,
        waterPh: report.waterPh || undefined,
        areaCleanedSqm: report.areaCleanedSqm || undefined,
        waterUsedL: report.waterUsedL || undefined,
        prePrRatio: report.prePrRatio || undefined,
        postPrRatio: report.postPrRatio || undefined,
        improvementPct: report.improvementPct || undefined,
        electricalChecksJson: linesToIncludes(report.electricalChecks),
        featuredOnHomepage: report.featuredOnHomepage,
        publish,
      }),
    onSuccess: invalidate,
  });

  const photoMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      if (beforeFile) formData.append("before", beforeFile);
      if (afterFile) formData.append("after", afterFile);
      return adminApi.post(`/admin/bookings/${id}/report/photos`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      setBeforeFile(null);
      setAfterFile(null);
      invalidate();
    },
  });

  return (
    <div>
      <Link to="/admin/bookings" className="text-sm text-gray-500 hover:text-forest">&larr; Back to Bookings</Link>

      <div className="mt-4">
        <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error} onRetry={query.refetch}>
          {query.data && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-ink">{query.data.service?.name || query.data.amcPlan?.name}</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      {query.data.user?.name} · {query.data.site?.label} · {query.data.plantCapacityKw} kW
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(query.data.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · {query.data.slotStart}-{query.data.slotEnd}
                    </p>
                  </div>
                  <StatusChip status={query.data.status} />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="label">Status</label>
                    <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Technician</label>
                    <select className="input" value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
                      <option value="">Unassigned</option>
                      {technicianQuery.data?.map((t) => (
                        <option key={t.id} value={t.id}>{t.user.name} — {t.zoneCity}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button className="btn-primary w-full" onClick={() => statusMutation.mutate()} disabled={statusMutation.isPending}>
                      {statusMutation.isPending ? "Updating…" : "Update Status"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="card">
                <h2 className="font-semibold text-ink">Activity Log</h2>
                {query.data.activityLog?.length ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {query.data.activityLog.map((entry) => (
                      <li key={entry.id} className="flex items-start justify-between gap-3 border-b border-gray-50 pb-2">
                        <span className="text-ink">{entry.message}</span>
                        <span className="shrink-0 text-xs text-gray-400">
                          {entry.actor?.name ?? "—"} · {new Date(entry.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-gray-400">No status or technician changes logged yet.</p>
                )}
              </div>

              <div className="card">
                <NotesPanel entityType="BOOKING" entityId={id} />
              </div>

              <div className="card">
                <h2 className="font-semibold text-ink">Before / After Photos</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-gray-400">Before</p>
                    {query.data.serviceReport?.beforePhotoUrl && (
                      <img src={resolveMediaUrl(query.data.serviceReport.beforePhotoUrl)} alt="Before" className="mb-2 aspect-video w-full rounded-lg object-cover" />
                    )}
                    <input type="file" accept="image/*" onChange={(e) => setBeforeFile(e.target.files[0])} />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-gray-400">After</p>
                    {query.data.serviceReport?.afterPhotoUrl && (
                      <img src={resolveMediaUrl(query.data.serviceReport.afterPhotoUrl)} alt="After" className="mb-2 aspect-video w-full rounded-lg object-cover" />
                    )}
                    <input type="file" accept="image/*" onChange={(e) => setAfterFile(e.target.files[0])} />
                  </div>
                </div>
                <button
                  className="btn-secondary mt-4"
                  onClick={() => photoMutation.mutate()}
                  disabled={photoMutation.isPending || (!beforeFile && !afterFile)}
                >
                  {photoMutation.isPending ? "Uploading…" : "Upload Photos"}
                </button>
                {photoMutation.isError && <p className="mt-2 text-sm text-red-600">{apiErrorMessage(photoMutation.error)}</p>}
              </div>

              <div className="card">
                <h2 className="font-semibold text-ink">Service Report</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={report.dcIsolationConfirmed} onChange={(e) => setReport({ ...report, dcIsolationConfirmed: e.target.checked })} />
                    DC Isolation Confirmed
                  </label>
                  <div>
                    <label className="label">Cleaning Method</label>
                    <select className="input" value={report.cleaningMethod} onChange={(e) => setReport({ ...report, cleaningMethod: e.target.value })}>
                      <option value="DRY">Dry</option>
                      <option value="WET">Wet</option>
                      <option value="ROBOTIC">Robotic</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={report.featuredOnHomepage} onChange={(e) => setReport({ ...report, featuredOnHomepage: e.target.checked })} />
                    Feature on homepage gallery
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <NumField label="Water TDS (ppm)" value={report.waterTds} onChange={(v) => setReport({ ...report, waterTds: v })} />
                  <NumField label="Water pH" value={report.waterPh} onChange={(v) => setReport({ ...report, waterPh: v })} />
                  <NumField label="Area Cleaned (m²)" value={report.areaCleanedSqm} onChange={(v) => setReport({ ...report, areaCleanedSqm: v })} />
                  <NumField label="Water Used (L)" value={report.waterUsedL} onChange={(v) => setReport({ ...report, waterUsedL: v })} />
                  <NumField label="Pre-clean PR Ratio (%)" value={report.prePrRatio} onChange={(v) => setReport({ ...report, prePrRatio: v })} />
                  <NumField label="Post-clean PR Ratio (%)" value={report.postPrRatio} onChange={(v) => setReport({ ...report, postPrRatio: v })} />
                  <NumField label="Improvement (%)" value={report.improvementPct} onChange={(v) => setReport({ ...report, improvementPct: v })} />
                </div>

                <div className="mt-4">
                  <label className="label">Electrical Checks (one "check: result" per line)</label>
                  <textarea rows="3" className="input" placeholder={"connectors: ok\ndcCableInsulation: ok\nearthing: ok"} value={report.electricalChecks} onChange={(e) => setReport({ ...report, electricalChecks: e.target.value })} />
                </div>

                {query.data.serviceReport?.adminApprovedAt && (
                  <p className="mt-3 text-xs text-forest">
                    Published to customer on {new Date(query.data.serviceReport.adminApprovedAt).toLocaleDateString("en-IN")}
                  </p>
                )}

                <div className="mt-4 flex gap-3">
                  <button className="btn-secondary" onClick={() => reportMutation.mutate(false)} disabled={reportMutation.isPending}>
                    {reportMutation.isPending ? "Saving…" : "Save Draft"}
                  </button>
                  <button className="btn-primary" onClick={() => reportMutation.mutate(true)} disabled={reportMutation.isPending}>
                    {reportMutation.isPending ? "Publishing…" : "Approve & Publish"}
                  </button>
                </div>
                {reportMutation.isError && <p className="mt-2 text-sm text-red-600">{apiErrorMessage(reportMutation.error)}</p>}
              </div>
            </div>
          )}
        </AsyncState>
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" step="0.1" className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
