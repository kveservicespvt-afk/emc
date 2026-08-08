import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";
import { StatusChip } from "../../components/ui/StatusChip.jsx";

export function AdminBookings() {
  const query = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => adminApi.get("/admin/bookings").then((r) => r.data.bookings),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Bookings</h1>

      <div className="card mt-6">
        <AsyncState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          onRetry={query.refetch}
          isEmpty={query.data?.length === 0}
          emptyMessage="No bookings yet."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400">
                  <th className="py-2">Customer</th>
                  <th className="py-2">Service / Plan</th>
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
                      <Link to={`/admin/bookings/${b.id}`} className="font-medium text-forest hover:underline">
                        {b.user?.name}
                      </Link>
                    </td>
                    <td className="py-3">{b.service?.name || b.amcPlan?.name}</td>
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
