import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { apiErrorMessage } from "../../api/client.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";
import { StatusChip } from "../../components/ui/StatusChip.jsx";

const STATUSES = ["PENDING", "CONFIRMED", "TECHNICIAN_ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const PAYMENT_STATUSES = ["PENDING", "PROCESSED", "SUCCESSFUL", "FAILED", "REFUNDED"];

export function AdminBookings() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkTechnicianId, setBulkTechnicianId] = useState("");

  const query = useQuery({
    queryKey: ["admin-bookings", status, city, technicianId, paymentStatus, from, to],
    queryFn: () =>
      adminApi
        .get("/admin/bookings", {
          params: {
            status: status || undefined,
            city: city || undefined,
            technicianId: technicianId || undefined,
            paymentStatus: paymentStatus || undefined,
            from: from || undefined,
            to: to || undefined,
          },
        })
        .then((r) => r.data.bookings),
  });

  const technicianQuery = useQuery({
    queryKey: ["admin-technicians"],
    queryFn: () => adminApi.get("/admin/technicians").then((r) => r.data.technicians),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["admin-badge-counts"] });
  };

  const bulkMutation = useMutation({
    mutationFn: () =>
      adminApi.patch("/admin/bookings/bulk-update", {
        bookingIds: selected,
        ...(bulkStatus ? { status: bulkStatus } : {}),
        ...(bulkTechnicianId ? { technicianId: bulkTechnicianId } : {}),
      }),
    onSuccess: () => {
      setSelected([]);
      setBulkStatus("");
      setBulkTechnicianId("");
      invalidate();
    },
  });

  const allSelected = query.data?.length > 0 && selected.length === query.data.length;
  const toggleAll = () => setSelected(allSelected ? [] : query.data.map((b) => b.id));
  const toggleOne = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Bookings</h1>

      <div className="card mt-6 flex flex-wrap gap-3">
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <input className="input max-w-xs" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <select className="input max-w-xs" value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
          <option value="">All technicians</option>
          <option value="unassigned">Unassigned</option>
          {technicianQuery.data?.map((t) => <option key={t.id} value={t.id}>{t.user.name}</option>)}
        </select>
        <select className="input max-w-xs" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
          <option value="">All payment statuses</option>
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">From</label>
          <input type="date" className="input max-w-[10rem]" value={from} onChange={(e) => setFrom(e.target.value)} />
          <label className="text-xs text-gray-500">To</label>
          <input type="date" className="input max-w-[10rem]" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {selected.length > 0 && (
        <div className="card mt-4 flex flex-wrap items-center gap-3 bg-offwhite">
          <span className="text-sm font-medium text-ink">{selected.length} selected</span>
          <select className="input max-w-xs" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
            <option value="">Set status…</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
          <select className="input max-w-xs" value={bulkTechnicianId} onChange={(e) => setBulkTechnicianId(e.target.value)}>
            <option value="">Assign technician…</option>
            {technicianQuery.data?.map((t) => <option key={t.id} value={t.id}>{t.user.name}</option>)}
          </select>
          <button
            className="btn-primary"
            disabled={(!bulkStatus && !bulkTechnicianId) || bulkMutation.isPending}
            onClick={() => bulkMutation.mutate()}
          >
            {bulkMutation.isPending ? "Applying…" : "Apply"}
          </button>
          <button className="text-sm text-gray-500 hover:text-forest" onClick={() => setSelected([])}>Clear selection</button>
          {bulkMutation.isError && <p className="text-sm text-red-600">{apiErrorMessage(bulkMutation.error)}</p>}
        </div>
      )}

      <div className="card mt-6">
        <AsyncState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          onRetry={query.refetch}
          isEmpty={query.data?.length === 0}
          emptyMessage="No bookings match these filters."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400">
                  <th className="w-8 py-2">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  </th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Service / Plan</th>
                  <th className="py-2">City</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Technician</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Payment</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map((b) => (
                  <tr key={b.id} className="border-b border-gray-50">
                    <td className="py-3">
                      <input type="checkbox" checked={selected.includes(b.id)} onChange={() => toggleOne(b.id)} />
                    </td>
                    <td className="py-3">
                      <Link to={`/admin/bookings/${b.id}`} className="font-medium text-forest hover:underline">
                        {b.user?.name}
                      </Link>
                    </td>
                    <td className="py-3">{b.service?.name || b.amcPlan?.name}</td>
                    <td className="py-3 text-gray-500">{b.site?.addressJson?.city ?? "—"}</td>
                    <td className="py-3 text-gray-500">
                      {new Date(b.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3 text-gray-500">{b.technician?.user?.name ?? "Unassigned"}</td>
                    <td className="py-3"><StatusChip status={b.status} /></td>
                    <td className="py-3"><StatusChip status={b.paymentStatus} /></td>
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
