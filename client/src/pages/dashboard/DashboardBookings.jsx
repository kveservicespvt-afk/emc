import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";
import { StatusChip } from "../../components/ui/StatusChip.jsx";

export function DashboardBookings() {
  // Polled (not just fetch-once) so a reschedule or status change made by an
  // admin shows up here without the customer needing to refresh — matches the
  // 60s poll AdminLayout already uses for sidebar badge counts.
  const query = useQuery({
    queryKey: ["bookings-me"],
    queryFn: () => api.get("/bookings/me").then((r) => r.data.bookings),
    refetchInterval: 30_000,
  });

  const now = new Date();
  const upcoming = query.data?.filter((b) => new Date(b.scheduledDate) >= now && b.status !== "CANCELLED") ?? [];
  const past = query.data?.filter((b) => new Date(b.scheduledDate) < now || b.status === "CANCELLED") ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-ink">My Bookings</h2>
        <AsyncState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          onRetry={query.refetch}
          isEmpty={query.data?.length === 0}
          emptyMessage="No bookings yet. Book your first service to see it here."
        >
          <div className="mt-4 space-y-8">
            <BookingGroup title="Upcoming" bookings={upcoming} />
            <BookingGroup title="Past" bookings={past} />
          </div>
        </AsyncState>
      </div>
    </div>
  );
}

function BookingGroup({ title, bookings }) {
  if (bookings.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-gray-400">{title}</p>
      <div className="mt-3 space-y-3">
        {bookings.map((b) => (
          <Link key={b.id} to={`/dashboard/bookings/${b.id}`} className="card flex items-center justify-between transition hover:shadow-soft">
            <div>
              <p className="font-semibold text-ink">{b.service?.name || b.amcPlan?.name}</p>
              <p className="text-sm text-gray-500">
                {new Date(b.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {b.slotStart}-{b.slotEnd}
              </p>
              {b.technician && <p className="text-xs text-gray-400">Technician: {b.technician.user?.name}</p>}
            </div>
            <div className="text-right">
              <p className="font-bold text-ink">₹{b.priceAmount}</p>
              <div className="mt-1 flex flex-wrap justify-end gap-1.5">
                <StatusChip status={b.status} />
                {b.serviceReport && <StatusChip status="REPORT_READY" />}
                {b.reportPending && <StatusChip status="REPORT_PENDING" />}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
