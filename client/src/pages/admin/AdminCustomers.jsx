import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";

export function AdminCustomers() {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [amcStatus, setAmcStatus] = useState("");

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Customers</h1>

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
