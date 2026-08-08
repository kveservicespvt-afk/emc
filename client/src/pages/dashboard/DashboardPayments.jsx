import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";
import { StatusChip } from "../../components/ui/StatusChip.jsx";

export function DashboardPayments() {
  const query = useQuery({ queryKey: ["payments-me"], queryFn: () => api.get("/payments/me").then((r) => r.data.payments) });

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-ink">Payment History</h2>
      <div className="mt-4">
        <AsyncState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          onRetry={query.refetch}
          isEmpty={query.data?.length === 0}
          emptyMessage="No payments yet."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400">
                  <th className="py-2">Service</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-3">{p.booking?.service?.name || p.booking?.amcPlan?.name}</td>
                    <td className="py-3 text-gray-500">{new Date(p.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="py-3 font-medium">₹{p.amount}</td>
                    <td className="py-3"><StatusChip status={p.status} /></td>
                    <td className="py-3 text-gray-400">
                      {p.invoiceUrl ? <a href={p.invoiceUrl} className="text-forest hover:underline">Download</a> : "Coming soon"}
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
