import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, resolveMediaUrl } from "../../api/client.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";
import { StatusChip } from "../../components/ui/StatusChip.jsx";

export function DashboardBookingDetail() {
  const { id } = useParams();
  const query = useQuery({ queryKey: ["booking", id], queryFn: () => api.get(`/bookings/${id}`).then((r) => r.data.booking) });

  return (
    <div>
      <Link to="/dashboard/bookings" className="text-sm text-gray-500 hover:text-forest">&larr; Back to My Bookings</Link>

      <div className="mt-4">
        <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error} onRetry={query.refetch}>
          {query.data && <BookingDetailContent booking={query.data} />}
        </AsyncState>
      </div>
    </div>
  );
}

function BookingDetailContent({ booking }) {
  const report = booking.serviceReport;

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">{booking.service?.name || booking.amcPlan?.name}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {new Date(booking.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · {booking.slotStart}-{booking.slotEnd}
            </p>
          </div>
          <StatusChip status={booking.status} />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase text-gray-400">Site</dt>
            <dd className="font-medium text-ink">{booking.site?.label}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-400">Capacity</dt>
            <dd className="font-medium text-ink">{booking.plantCapacityKw} kW</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-400">Price</dt>
            <dd className="font-medium text-ink">₹{booking.priceAmount}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-400">Payment</dt>
            <dd><StatusChip status={booking.paymentStatus} /></dd>
          </div>
        </dl>

        {booking.technician && (
          <div className="mt-6 flex items-center gap-3 rounded-lg bg-offwhite p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-white">
              {booking.technician.user?.name?.[0]}
            </div>
            <div>
              <p className="font-medium text-ink">{booking.technician.user?.name}</p>
              <p className="text-xs text-gray-500">Rating {booking.technician.ratingAvg?.toFixed(1)} ★ · {booking.technician.zoneCity}</p>
            </div>
          </div>
        )}
      </div>

      {!report && booking.reportPending && (
        <div className="card text-center text-sm text-gray-500">
          Your technician's report is being reviewed and will appear here once it's published.
        </div>
      )}

      {report && (
        <div className="card">
          <h3 className="text-lg font-bold text-ink">Service Report</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {report.beforePhotoUrl && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-gray-400">Before</p>
                <img src={resolveMediaUrl(report.beforePhotoUrl)} alt="Before cleaning" className="aspect-video w-full rounded-lg object-cover" />
              </div>
            )}
            {report.afterPhotoUrl && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-gray-400">After</p>
                <img src={resolveMediaUrl(report.afterPhotoUrl)} alt="After cleaning" className="aspect-video w-full rounded-lg object-cover" />
              </div>
            )}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <ReportStat label="Pre-clean PR Ratio" value={report.prePrRatio ? `${report.prePrRatio}%` : "—"} />
            <ReportStat label="Post-clean PR Ratio" value={report.postPrRatio ? `${report.postPrRatio}%` : "—"} />
            <ReportStat label="Improvement" value={report.improvementPct ? `+${report.improvementPct}%` : "—"} highlight />
            <ReportStat label="Cleaning Method" value={report.cleaningMethod ?? "—"} />
            <ReportStat label="Water TDS" value={report.waterTds ? `${report.waterTds} ppm` : "—"} />
            <ReportStat label="Water Used" value={report.waterUsedL ? `${report.waterUsedL} L` : "—"} />
            <ReportStat label="Area Cleaned" value={report.areaCleanedSqm ? `${report.areaCleanedSqm} m²` : "—"} />
            <ReportStat label="DC Isolation" value={report.dcIsolationConfirmed ? "Confirmed" : "—"} />
          </dl>
        </div>
      )}
    </div>
  );
}

function ReportStat({ label, value, highlight }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-400">{label}</dt>
      <dd className={`font-semibold ${highlight ? "text-forest" : "text-ink"}`}>{value}</dd>
    </div>
  );
}
