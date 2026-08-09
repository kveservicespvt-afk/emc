import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { apiErrorMessage } from "../../api/client.js";

export function ConvertToAmcCard({ fieldLead }) {
  const queryClient = useQueryClient();
  const [amcPlanId, setAmcPlanId] = useState("");
  const [startDate, setStartDate] = useState("");

  const plansQuery = useQuery({
    queryKey: ["admin-amc-plans"],
    queryFn: () => adminApi.get("/admin/amc-plans").then((r) => r.data.amcPlans),
  });

  const convertMutation = useMutation({
    mutationFn: () => adminApi.post(`/admin/field-leads/${fieldLead.id}/convert`, { amcPlanId, startDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-field-lead", fieldLead.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-field-leads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-field-lead-stats"] });
    },
  });

  if (fieldLead.convertedSubscriptionId) {
    const sub = fieldLead.convertedSubscription;
    return (
      <div className="card border-l-4 border-forest bg-forest/5">
        <h2 className="font-semibold text-forest">Converted to AMC</h2>
        <p className="mt-1 text-sm text-ink">
          {sub?.amcPlan?.name ?? "AMC plan"} · started {sub?.startDate ? new Date(sub.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
        </p>
        {sub?.userId && (
          <Link to={`/admin/customers/${sub.userId}`} className="mt-2 inline-block text-sm font-medium text-forest hover:underline">
            View customer &amp; subscription →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="font-semibold text-ink">Convert to AMC</h2>
      {!fieldLead.plantCapacityKw ? (
        <p className="mt-2 text-sm text-gray-500">
          This lead has no plant capacity on file — add it before converting (a site can't be created without one).
        </p>
      ) : (
        <form
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            convertMutation.mutate();
          }}
        >
          <div>
            <label className="label">AMC Plan</label>
            <select className="input" required value={amcPlanId} onChange={(e) => setAmcPlanId(e.target.value)}>
              <option value="">Select a plan…</option>
              {plansQuery.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-gold w-full" disabled={convertMutation.isPending}>
              {convertMutation.isPending ? "Converting…" : "Convert to AMC"}
            </button>
          </div>
        </form>
      )}
      {convertMutation.isError && <p className="mt-2 text-sm text-red-600">{apiErrorMessage(convertMutation.error)}</p>}
    </div>
  );
}
