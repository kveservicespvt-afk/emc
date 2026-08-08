import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { apiErrorMessage } from "../../api/client.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";
import { StatusChip } from "../../components/ui/StatusChip.jsx";
import { downloadBlob } from "../../lib/downloadBlob.js";

const STATUSES = ["PENDING", "PROCESSED", "SUCCESSFUL", "FAILED", "REFUNDED"];

function money(amount) {
  return `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;
}

export function AdminPayments() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const filters = {
    status: status || undefined,
    search: search || undefined,
    from: from || undefined,
    to: to || undefined,
  };

  const summaryQuery = useQuery({
    queryKey: ["admin-payments-summary"],
    queryFn: () => adminApi.get("/admin/payments/summary").then((r) => r.data),
  });

  const query = useQuery({
    queryKey: ["admin-payments", status, search, from, to],
    queryFn: () => adminApi.get("/admin/payments", { params: filters }).then((r) => r.data.payments),
  });

  const unpaidQuery = useQuery({
    queryKey: ["admin-bookings", "unpaid-for-payments"],
    queryFn: () => adminApi.get("/admin/bookings", { params: { paymentStatus: "PENDING" } }).then((r) => r.data.bookings),
  });

  const markPaidMutation = useMutation({
    mutationFn: (bookingId) => adminApi.post(`/admin/payments/${bookingId}/mark-paid`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-payments-summary"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await adminApi.get("/admin/payments/export", { params: filters, responseType: "blob" });
      downloadBlob(res.data, `payments-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExporting(false);
    }
  };

  const cards = [
    { label: "Collected This Month", value: summaryQuery.data?.collectedThisMonth },
    { label: "Total Pending", value: summaryQuery.data?.totalPending },
    { label: "Total Refunded", value: summaryQuery.data?.totalRefunded },
    { label: "Total All-Time", value: summaryQuery.data?.totalAllTime },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Payments</h1>
        <button className="btn-secondary" onClick={handleExport} disabled={exporting}>
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <p className="text-xs uppercase text-gray-400">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-ink">
              {summaryQuery.isLoading ? "…" : money(c.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="card mt-6 flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search customer name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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
          emptyMessage="No payments match these filters."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400">
                  <th className="py-2">Customer</th>
                  <th className="py-2">Service / Plan</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Method</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Gateway Ref</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-3">{p.booking?.user?.name ?? "—"}</td>
                    <td className="py-3">{p.booking?.service?.name || p.booking?.amcPlan?.name || "—"}</td>
                    <td className="py-3 font-medium text-ink">{money(p.amount)}</td>
                    <td className="py-3 text-gray-500">{p.method}</td>
                    <td className="py-3"><StatusChip status={p.status} /></td>
                    <td className="py-3 text-xs text-gray-400">{p.gatewayRef}</td>
                    <td className="py-3 text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AsyncState>
      </div>

      <div className="card mt-6">
        <h2 className="font-semibold text-ink">Unpaid Bookings</h2>
        <p className="mt-1 text-sm text-gray-500">Mark a cash/offline payment as paid — records it here and flips the booking to paid.</p>
        {markPaidMutation.isError && <p className="mt-2 text-sm text-red-600">{apiErrorMessage(markPaidMutation.error)}</p>}
        <div className="mt-3">
          <AsyncState
            isLoading={unpaidQuery.isLoading}
            isError={unpaidQuery.isError}
            error={unpaidQuery.error}
            onRetry={unpaidQuery.refetch}
            isEmpty={unpaidQuery.data?.length === 0}
            emptyMessage="No unpaid bookings — everything's collected."
          >
            <div className="divide-y divide-gray-50">
              {unpaidQuery.data?.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-ink">{b.user?.name}</p>
                    <p className="text-sm text-gray-500">
                      {b.service?.name || b.amcPlan?.name} · {money(b.priceAmount)} ·{" "}
                      {new Date(b.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <button
                    className="btn-secondary text-sm"
                    onClick={() => markPaidMutation.mutate(b.id)}
                    disabled={markPaidMutation.isPending}
                  >
                    {markPaidMutation.isPending && markPaidMutation.variables === b.id ? "Marking…" : "Mark as Paid"}
                  </button>
                </div>
              ))}
            </div>
          </AsyncState>
        </div>
      </div>
    </div>
  );
}
