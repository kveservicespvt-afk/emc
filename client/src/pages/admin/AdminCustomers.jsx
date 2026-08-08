import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { apiErrorMessage } from "../../api/client.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";
import { downloadBlob } from "../../lib/downloadBlob.js";

const emptyForm = { name: "", phone: "", email: "", city: "", address: "", plantCapacityKw: "" };

export function AdminCustomers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [amcStatus, setAmcStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const citiesQuery = useQuery({
    queryKey: ["admin-cities"],
    queryFn: () => adminApi.get("/admin/cities").then((r) => r.data.cities),
  });

  const query = useQuery({
    queryKey: ["admin-customers", search, city, amcStatus],
    queryFn: () =>
      adminApi
        .get("/admin/customers", { params: { search: search || undefined, city: city || undefined, amcStatus: amcStatus || undefined } })
        .then((r) => r.data.customers),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-customers"] });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.post("/admin/customers", {
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        city: form.city || undefined,
        address: form.address || undefined,
        plantCapacityKw: form.plantCapacityKw ? Number(form.plantCapacityKw) : undefined,
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
      return adminApi.post("/admin/customers/import", formData, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
    },
    onSuccess: (data) => {
      setImportResult(data);
      invalidate();
    },
  });

  function handleFilePicked(e) {
    const file = e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file
    if (file) importMutation.mutate(file);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await adminApi.get("/admin/customers/export", { responseType: "blob" });
      downloadBlob(res.data, `customers-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExporting(false);
    }
  }

  async function handleSampleDownload() {
    const res = await adminApi.get("/admin/customers/sample-csv", { responseType: "blob" });
    downloadBlob(res.data, "customers-sample.csv");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Customers</h1>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary text-sm" onClick={() => setShowForm((prev) => !prev)}>+ New Customer</button>
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

      {showForm && (
        <form
          className="card mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <h2 className="font-semibold text-ink">New Customer</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Name</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
          </div>
          <p className="text-xs text-gray-400">Phone or email is required. City + address + plant capacity together create a site for this customer.</p>
          {createMutation.isError && <p className="text-sm text-red-600">{apiErrorMessage(createMutation.error)}</p>}
          <div className="flex gap-3">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Customer"}
            </button>
          </div>
        </form>
      )}

      {importMutation.isError && (
        <p className="mt-4 text-sm text-red-600">{apiErrorMessage(importMutation.error)}</p>
      )}

      {importResult && (
        <div className="card mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Import Result</h2>
            <button className="text-sm text-gray-500 hover:text-forest" onClick={() => setImportResult(null)}>Dismiss</button>
          </div>
          <p className="mt-2 text-sm text-forest">{importResult.created} customer{importResult.created === 1 ? "" : "s"} created.</p>
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

      <div className="card mt-6 flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search name, phone, or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-xs" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities</option>
          {citiesQuery.data?.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
        <select className="input max-w-xs" value={amcStatus} onChange={(e) => setAmcStatus(e.target.value)}>
          <option value="">Any AMC status</option>
          <option value="active">Active AMC</option>
          <option value="none">No active AMC</option>
        </select>
      </div>

      <div className="card mt-6">
        <AsyncState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          onRetry={query.refetch}
          isEmpty={query.data?.length === 0}
          emptyMessage="No customers match these filters."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400">
                  <th className="py-2">Name</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">City</th>
                  <th className="py-2">Bookings</th>
                  <th className="py-2">AMC</th>
                  <th className="py-2">Joined</th>
                  <th className="py-2">Last Booking</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="py-3">
                      <Link to={`/admin/customers/${c.id}`} className="font-medium text-forest hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-3 text-gray-500">{c.phone ?? "—"}</td>
                    <td className="py-3 text-gray-500">{c.email ?? "—"}</td>
                    <td className="py-3 text-gray-500">{c.city ?? "—"}</td>
                    <td className="py-3">{c.bookingCount}</td>
                    <td className="py-3">
                      {c.hasActiveAmc ? (
                        <span className="rounded-full bg-forest/10 px-3 py-1 text-xs font-semibold text-forest">Active</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 text-gray-500">{new Date(c.joinedAt).toLocaleDateString("en-IN")}</td>
                    <td className="py-3 text-gray-500">
                      {c.lastBookingDate ? new Date(c.lastBookingDate).toLocaleDateString("en-IN") : "—"}
                    </td>
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
