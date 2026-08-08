import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { adminApi } from "../../api/adminClient.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";
import { downloadBlob } from "../../lib/downloadBlob.js";

const TABS = [
  { key: "revenue", label: "Revenue" },
  { key: "bookings", label: "Bookings" },
  { key: "customers", label: "Customers" },
  { key: "leads", label: "Lead Conversion" },
  { key: "technicians", label: "Technician Performance" },
];

function money(amount) {
  return `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;
}

export function AdminReports() {
  const [tab, setTab] = useState("revenue");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const params = { from: from || undefined, to: to || undefined };

  const query = useQuery({
    queryKey: ["admin-analytics", tab, from, to],
    queryFn: () => adminApi.get(`/admin/analytics/${tab}`, { params }).then((r) => r.data),
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await adminApi.get(`/admin/analytics/${tab}`, { params: { ...params, format: "csv" }, responseType: "blob" });
      downloadBlob(res.data, `${tab}-report-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Reports</h1>
        <button className="btn-secondary" onClick={handleExport} disabled={exporting}>
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <div className="card mt-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-offwhite p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${tab === t.key ? "bg-forest text-white" : "text-gray-500 hover:text-ink"}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-gray-500">From</label>
          <input type="date" className="input max-w-[10rem]" value={from} onChange={(e) => setFrom(e.target.value)} />
          <label className="text-xs text-gray-500">To</label>
          <input type="date" className="input max-w-[10rem]" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="mt-6">
        <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error} onRetry={query.refetch}>
          {query.data && (
            <>
              {tab === "revenue" && <RevenueReport data={query.data} />}
              {tab === "bookings" && <BookingsReport data={query.data} />}
              {tab === "customers" && <CustomersReport data={query.data} />}
              {tab === "leads" && <LeadsReport data={query.data} />}
              {tab === "technicians" && <TechniciansReport data={query.data} />}
            </>
          )}
        </AsyncState>
      </div>
    </div>
  );
}

function RevenueReport({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Service Revenue" value={money(data.totals.serviceTotal)} />
        <SummaryCard label="AMC Revenue" value={money(data.totals.amcTotal)} />
        <SummaryCard label="Total" value={money(data.totals.total)} />
      </div>
      <div className="card">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.buckets}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="serviceRevenue" name="Service" stroke="#166534" strokeWidth={2} />
            <Line type="monotone" dataKey="amcRevenue" name="AMC" stroke="#b45309" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <DataTable
        columns={["Period", "Service Revenue", "AMC Revenue", "Total"]}
        rows={data.buckets.map((b) => [b.period, money(b.serviceRevenue), money(b.amcRevenue), money(b.total)])}
        emptyMessage="No revenue in this range."
      />
    </div>
  );
}

function BookingsReport({ data }) {
  return (
    <div className="space-y-6">
      <SummaryCard label="Total Bookings" value={data.total} />
      <div className="card">
        <h3 className="mb-3 text-sm font-semibold text-ink">By Status</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.byStatus}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#166534" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DataTable columns={["City", "Count"]} rows={data.byCity.map((r) => [r.city, r.count])} emptyMessage="No bookings in this range." />
        <DataTable columns={["Service", "Count"]} rows={data.byService.map((r) => [r.service, r.count])} emptyMessage="No bookings in this range." />
      </div>
    </div>
  );
}

function CustomersReport({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Repeat Customers" value={data.repeatVsOneTime.repeat} />
        <SummaryCard label="One-Time Customers" value={data.repeatVsOneTime.oneTime} />
        <SummaryCard label="AMC Subscribers" value={data.amcVsOneTimeSubscribers.amcSubscribers} />
        <SummaryCard label="One-Time-Only Customers" value={data.amcVsOneTimeSubscribers.oneTimeOnly} />
      </div>
      <div className="card">
        <h3 className="mb-3 text-sm font-semibold text-ink">New Customers Over Time</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.newCustomersOverTime}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" name="New Customers" stroke="#166534" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <DataTable
        columns={["Period", "New Customers"]}
        rows={data.newCustomersOverTime.map((r) => [r.period, r.count])}
        emptyMessage="No new customers in this range."
      />
    </div>
  );
}

function LeadsReport({ data }) {
  const rows = [
    { label: "General", ...data.general },
    { label: "Commercial", ...data.commercial },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="card">
            <h3 className="font-semibold text-ink">{r.label} Queries</h3>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-gray-400">Received</dt><dd className="text-lg font-bold text-ink">{r.received}</dd></div>
              <div><dt className="text-gray-400">Converted</dt><dd className="text-lg font-bold text-ink">{r.converted}</dd></div>
              <div><dt className="text-gray-400">Conversion Rate</dt><dd className="text-lg font-bold text-ink">{(r.conversionRate * 100).toFixed(1)}%</dd></div>
              <div><dt className="text-gray-400">Avg Time to Contact</dt><dd className="text-lg font-bold text-ink">{r.avgTimeToContactHours != null ? `${r.avgTimeToContactHours.toFixed(1)}h` : "—"}</dd></div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

function TechniciansReport({ data }) {
  return (
    <div className="space-y-6">
      <div className="card">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.technicians}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="completedBookings" name="Completed Bookings" fill="#166534" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable
        columns={["Technician", "Completed Bookings", "Rating Avg", "Defects Flagged"]}
        rows={data.technicians.map((t) => [t.name, t.completedBookings, t.ratingAvg.toFixed(1), t.defectCount])}
        emptyMessage="No technician activity in this range."
      />
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="card">
      <p className="text-xs uppercase text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

function DataTable({ columns, rows, emptyMessage }) {
  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase text-gray-400">
              {columns.map((c) => <th key={c} className="py-2">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={columns.length} className="py-6 text-center text-gray-400">{emptyMessage}</td></tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-50">
                {row.map((cell, j) => <td key={j} className="py-2.5">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
