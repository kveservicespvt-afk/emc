import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { apiErrorMessage, resolveMediaUrl } from "../../api/client.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";
import { StatusChip } from "../../components/ui/StatusChip.jsx";

export function AdminCustomerDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");

  const query = useQuery({
    queryKey: ["admin-customer", id],
    queryFn: () => adminApi.get(`/admin/customers/${id}`).then((r) => r.data),
  });

  useEffect(() => {
    if (query.data) setNotes(query.data.customer.internalNotes ?? "");
  }, [query.data]);

  const notesMutation = useMutation({
    mutationFn: () => adminApi.patch(`/admin/customers/${id}/notes`, { internalNotes: notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-customer", id] }),
  });

  return (
    <div>
      <Link to="/admin/customers" className="text-sm text-gray-500 hover:text-forest">&larr; Back to Customers</Link>

      <div className="mt-4">
        <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error} onRetry={query.refetch}>
          {query.data && (
            <CustomerDetailContent
              customer={query.data.customer}
              leads={query.data.leads}
              notes={notes}
              setNotes={setNotes}
              onSaveNotes={() => notesMutation.mutate()}
              savingNotes={notesMutation.isPending}
              notesError={notesMutation.isError ? apiErrorMessage(notesMutation.error) : null}
            />
          )}
        </AsyncState>
      </div>
    </div>
  );
}

function CustomerDetailContent({ customer, leads, notes, setNotes, onSaveNotes, savingNotes, notesError }) {
  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-xl font-bold text-ink">{customer.name}</h1>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Field label="Phone" value={customer.phone ?? "—"} />
          <Field label="Email" value={customer.email ?? "—"} />
          <Field label="Joined" value={new Date(customer.createdAt).toLocaleDateString("en-IN")} />
          <Field label="Referral Code" value={customer.referralCode} />
        </dl>
      </div>

      <div className="card">
        <h2 className="font-semibold text-ink">Sites ({customer.sites.length})</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {customer.sites.map((s) => (
            <div key={s.id} className="rounded-lg border border-gray-100 p-3 text-sm">
              <p className="font-medium text-ink">{s.label}</p>
              <p className="text-gray-500">{s.plantCapacityKw} kW · {s.mountType}</p>
              <p className="text-xs text-gray-400">
                {s.addressJson?.line1}, {s.addressJson?.city}, {s.addressJson?.state} {s.addressJson?.pincode}
              </p>
            </div>
          ))}
          {customer.sites.length === 0 && <p className="text-sm text-gray-400">No sites saved.</p>}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-ink">Booking History ({customer.bookings.length})</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase text-gray-400">
                <th className="py-2">Date</th>
                <th className="py-2">Service / Plan</th>
                <th className="py-2">Technician</th>
                <th className="py-2">Status</th>
                <th className="py-2">Payment</th>
                <th className="py-2">Price</th>
              </tr>
            </thead>
            <tbody>
              {customer.bookings.map((b) => (
                <tr key={b.id} className="border-b border-gray-50">
                  <td className="py-3 text-gray-500">{new Date(b.scheduledDate).toLocaleDateString("en-IN")}</td>
                  <td className="py-3">{b.service?.name || b.amcPlan?.name}</td>
                  <td className="py-3 text-gray-500">{b.technician?.user?.name ?? "Unassigned"}</td>
                  <td className="py-3"><StatusChip status={b.status} /></td>
                  <td className="py-3"><StatusChip status={b.paymentStatus} /></td>
                  <td className="py-3">₹{b.priceAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {customer.bookings.length === 0 && <p className="text-sm text-gray-400">No bookings yet.</p>}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-ink">Service Reports</h2>
        <div className="mt-3 space-y-4">
          {customer.bookings.filter((b) => b.serviceReport).map((b) => (
            <div key={b.id} className="rounded-lg border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-ink">{b.service?.name || b.amcPlan?.name} — {new Date(b.scheduledDate).toLocaleDateString("en-IN")}</p>
                {b.serviceReport.adminApprovedAt ? (
                  <span className="text-xs text-forest">Published</span>
                ) : (
                  <span className="text-xs text-gold">Draft</span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {b.serviceReport.beforePhotoUrl && (
                  <img src={resolveMediaUrl(b.serviceReport.beforePhotoUrl)} alt="Before" className="aspect-video w-full rounded-lg object-cover" />
                )}
                {b.serviceReport.afterPhotoUrl && (
                  <img src={resolveMediaUrl(b.serviceReport.afterPhotoUrl)} alt="After" className="aspect-video w-full rounded-lg object-cover" />
                )}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <Field label="Pre-clean PR" value={b.serviceReport.prePrRatio ? `${b.serviceReport.prePrRatio}%` : "—"} />
                <Field label="Post-clean PR" value={b.serviceReport.postPrRatio ? `${b.serviceReport.postPrRatio}%` : "—"} />
                <Field label="Water TDS" value={b.serviceReport.waterTds ? `${b.serviceReport.waterTds} ppm` : "—"} />
                <Field label="Method" value={b.serviceReport.cleaningMethod ?? "—"} />
              </dl>
              <Link to={`/admin/bookings/${b.id}`} className="mt-2 inline-block text-xs text-forest hover:underline">
                Edit report &rarr;
              </Link>
            </div>
          ))}
          {customer.bookings.filter((b) => b.serviceReport).length === 0 && (
            <p className="text-sm text-gray-400">No service reports yet.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-ink">Payments</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase text-gray-400">
                <th className="py-2">Date</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2">Method</th>
              </tr>
            </thead>
            <tbody>
              {customer.bookings.flatMap((b) => b.payments).map((p) => (
                <tr key={p.id} className="border-b border-gray-50">
                  <td className="py-3 text-gray-500">{new Date(p.createdAt).toLocaleDateString("en-IN")}</td>
                  <td className="py-3">₹{p.amount}</td>
                  <td className="py-3"><StatusChip status={p.status} /></td>
                  <td className="py-3 text-gray-500">{p.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {customer.bookings.flatMap((b) => b.payments).length === 0 && (
            <p className="text-sm text-gray-400">No payments yet.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-ink">AMC Subscriptions ({customer.subscriptions.length})</h2>
        <div className="mt-3 space-y-3">
          {customer.subscriptions.map((s) => (
            <div key={s.id} className="rounded-lg border border-gray-100 p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-ink">{s.amcPlan.name}</p>
                <StatusChip status={s.status} />
              </div>
              <p className="text-gray-500">
                Renews {new Date(s.renewalDate).toLocaleDateString("en-IN")} · {s.bookings.length} visits scheduled
              </p>
            </div>
          ))}
          {customer.subscriptions.length === 0 && <p className="text-sm text-gray-400">No AMC subscriptions.</p>}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-ink">Leads (matched by phone)</h2>
        <div className="mt-3 space-y-2">
          {leads.map((l) => (
            <div key={l.id} className="rounded-lg border border-gray-100 p-3 text-sm">
              <p className="font-medium text-ink">{l.leadType.replace(/_/g, " ")} · {l.status}</p>
              <p className="text-gray-500">{l.message || "No message"} — {new Date(l.createdAt).toLocaleDateString("en-IN")}</p>
            </div>
          ))}
          {leads.length === 0 && <p className="text-sm text-gray-400">No leads on record for this phone number.</p>}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-ink">Internal Notes <span className="font-normal text-xs text-gray-400">(admin-only, never shown to the customer)</span></h2>
        <textarea
          rows="4"
          className="input mt-3"
          placeholder="e.g. Prefers evening slots, had a billing dispute in March, VIP account…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        {notesError && <p className="mt-2 text-sm text-red-600">{notesError}</p>}
        <button className="btn-primary mt-3" onClick={onSaveNotes} disabled={savingNotes}>
          {savingNotes ? "Saving…" : "Save Notes"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-400">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
