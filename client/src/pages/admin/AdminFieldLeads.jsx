import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { apiErrorMessage } from "../../api/client.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";
import { FieldLeadStatusLogPopover } from "../../components/admin/FieldLeadStatusLogPopover.jsx";
import { downloadBlob } from "../../lib/downloadBlob.js";

const CALL_STATUSES = [
  "NOT_CALLED",
  "CALLED_NO_ANSWER",
  "CALLED_INTERESTED",
  "CALLED_NOT_INTERESTED",
  "FOLLOWUP_SCHEDULED",
  "CONVERTED",
  "LOST",
];

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "all", label: "All" },
  { key: "converted", label: "Converted" },
];

const emptyForm = { houseNumber: "", customerName: "", phone: "", address: "", city: "", plantCapacityKw: "", numberOfPanels: "" };

function isOverdue(fieldLead) {
  return fieldLead.nextFollowupDate && new Date(fieldLead.nextFollowupDate) < new Date() && !["CONVERTED", "LOST"].includes(fieldLead.callStatus);
}

export function AdminFieldLeads() {
  const queryClient = useQueryClient();
  const [view, setView] = useState("pending");
  const [callStatus, setCallStatus] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [city, setCity] = useState("");
  const [dateField, setDateField] = useState("created");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const filterParams = {
    view,
    callStatus: callStatus || undefined,
    assignedToId: assignedToId || undefined,
    city: city || undefined,
    dateField,
    from: from || undefined,
    to: to || undefined,
    sortBy,
    sortDir,
  };

  const statsQuery = useQuery({
    queryKey: ["admin-field-lead-stats"],
    queryFn: () => adminApi.get("/admin/field-leads/stats").then((r) => r.data),
  });

  const staffQuery = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () => adminApi.get("/admin/staff").then((r) => r.data.staff),
  });

  const query = useQuery({
    queryKey: ["admin-field-leads", filterParams],
    queryFn: () => adminApi.get("/admin/field-leads", { params: filterParams }).then((r) => r.data.fieldLeads),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-field-leads"] });
    queryClient.invalidateQueries({ queryKey: ["admin-field-lead-stats"] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.post("/admin/field-leads", {
        houseNumber: form.houseNumber || undefined,
        customerName: form.customerName,
        phone: form.phone,
        address: form.address || undefined,
        city: form.city || undefined,
        plantCapacityKw: form.plantCapacityKw ? Number(form.plantCapacityKw) : undefined,
        numberOfPanels: form.numberOfPanels ? Number(form.numberOfPanels) : undefined,
      }),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setForm(emptyForm);
    },
  });

  const importMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append("file", file);
      return adminApi.post("/admin/field-leads/bulk-import", formData, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
    },
    onSuccess: (data) => {
      setImportResult(data);
      invalidate();
    },
  });

  function handleFilePicked(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) importMutation.mutate(file);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await adminApi.get("/admin/field-leads/export", { params: filterParams, responseType: "blob" });
      downloadBlob(res.data, `field-leads-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExporting(false);
    }
  }

  async function handleSampleDownload() {
    const res = await adminApi.get("/admin/field-leads/sample-csv", { responseType: "blob" });
    downloadBlob(res.data, "field-leads-sample.csv");
  }

  function toggleSort(column) {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  const STAT_CARDS = statsQuery.data && [
    { label: "Total Leads", value: statsQuery.data.total },
    { label: "Pending", value: statsQuery.data.pending },
    { label: "Converted", value: statsQuery.data.converted },
    { label: "Conversion Rate", value: `${(statsQuery.data.conversionRate * 100).toFixed(1)}%` },
    { label: "Overdue Follow-ups", value: statsQuery.data.overdueFollowups, urgent: true },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Field Leads</h1>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary text-sm" onClick={() => setShowForm((prev) => !prev)}>+ New Field Lead</button>
          <button className="btn-secondary text-sm" onClick={handleSampleDownload}>Download Sample Format</button>
          <button className="btn-secondary text-sm" onClick={() => fileInputRef.current.click()} disabled={importMutation.isPending}>
            {importMutation.isPending ? "Importing…" : "Import CSV"}
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFilePicked} />
          <button className="btn-secondary text-sm" onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {(STAT_CARDS ?? Array.from({ length: 5 })).map((c, i) => (
          <div key={c?.label ?? i} className="card">
            <p className="text-xs font-semibold uppercase text-gray-400">{c?.label ?? "…"}</p>
            <p className={`mt-2 text-3xl font-extrabold ${c?.urgent && c.value > 0 ? "text-red-600" : "text-forest"}`}>
              {c ? c.value : "—"}
            </p>
          </div>
        ))}
      </div>

      {showForm && (
        <form
          className="card mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <h2 className="font-semibold text-ink">New Field Lead</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">House Number</label>
              <input className="input" value={form.houseNumber} onChange={(e) => setForm({ ...form, houseNumber: e.target.value })} />
            </div>
            <div>
              <label className="label">Customer Name</label>
              <input className="input" required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="label">Plant Capacity (kW)</label>
              <input type="number" step="0.1" className="input" value={form.plantCapacityKw} onChange={(e) => setForm({ ...form, plantCapacityKw: e.target.value })} />
            </div>
            <div>
              <label className="label">Number of Panels</label>
              <input type="number" className="input" value={form.numberOfPanels} onChange={(e) => setForm({ ...form, numberOfPanels: e.target.value })} />
            </div>
          </div>
          {createMutation.isError && <p className="text-sm text-red-600">{apiErrorMessage(createMutation.error)}</p>}
          <div className="flex gap-3">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Field Lead"}
            </button>
          </div>
        </form>
      )}

      {importMutation.isError && <p className="mt-4 text-sm text-red-600">{apiErrorMessage(importMutation.error)}</p>}

      {importResult && (
        <div className="card mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Import Result</h2>
            <button className="text-sm text-gray-500 hover:text-forest" onClick={() => setImportResult(null)}>Dismiss</button>
          </div>
          <p className="mt-2 text-sm text-forest">{importResult.created} lead{importResult.created === 1 ? "" : "s"} added.</p>
          {importResult.skipped.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-ink">{importResult.skipped.length} row{importResult.skipped.length === 1 ? "" : "s"} skipped:</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {importResult.skipped.map((s) => (
                  <li key={s.row}>Row {s.row}: {s.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-1 rounded-lg bg-offwhite p-1" style={{ width: "fit-content" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${view === t.key ? "bg-forest text-white" : "text-gray-500 hover:text-ink"}`}
            onClick={() => setView(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card mt-4 flex flex-wrap gap-3">
        <select className="input max-w-xs" value={callStatus} onChange={(e) => setCallStatus(e.target.value)}>
          <option value="">All call statuses</option>
          {CALL_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <select className="input max-w-xs" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
          <option value="">All staff</option>
          <option value="unassigned">Unassigned</option>
          {staffQuery.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input className="input max-w-xs" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <div className="flex items-center gap-2">
          <select className="input max-w-[9rem]" value={dateField} onChange={(e) => setDateField(e.target.value)}>
            <option value="created">Created</option>
            <option value="lastCall">Last Call</option>
          </select>
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
          emptyMessage="No field leads match these filters."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400">
                  <th className="py-2">House #</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">City</th>
                  <SortableHeader label="kW" column="plantCapacityKw" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  <th className="py-2">Status</th>
                  <SortableHeader label="Last Call" column="lastCallDate" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Next Follow-up" column="nextFollowupDate" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                  <th className="py-2">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map((f) => (
                  <tr key={f.id} className="border-b border-gray-50">
                    <td className="py-3 text-gray-500">{f.houseNumber ?? "—"}</td>
                    <td className="py-3">
                      <Link to={`/admin/field-leads/${f.id}`} className="font-medium text-forest hover:underline">
                        {f.customerName}
                      </Link>
                    </td>
                    <td className="py-3 text-gray-500">{f.phone}</td>
                    <td className="py-3 text-gray-500">{f.city ?? "—"}</td>
                    <td className="py-3 text-gray-500">{f.plantCapacityKw ?? "—"}</td>
                    <td className="py-3"><FieldLeadStatusLogPopover fieldLeadId={f.id} status={f.callStatus} /></td>
                    <td className="py-3 text-gray-500">
                      {f.lastCallDate ? new Date(f.lastCallDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                    </td>
                    <td className={`py-3 ${isOverdue(f) ? "font-semibold text-red-600" : "text-gray-500"}`}>
                      {f.nextFollowupDate ? new Date(f.nextFollowupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                    </td>
                    <td className="py-3 text-gray-500">{f.assignedTo?.name ?? "Unassigned"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AsyncState>
      </div>
    </div>
  );
}

function SortableHeader({ label, column, sortBy, sortDir, onSort }) {
  const active = sortBy === column;
  return (
    <th className="cursor-pointer select-none py-2 hover:text-ink" onClick={() => onSort(column)}>
      {label} {active && (sortDir === "asc" ? "↑" : "↓")}
    </th>
  );
}
