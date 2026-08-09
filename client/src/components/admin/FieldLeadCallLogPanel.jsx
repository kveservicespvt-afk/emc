import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { apiErrorMessage } from "../../api/client.js";
import { StatusChip } from "../ui/StatusChip.jsx";

const CALL_OUTCOMES = [
  "CALLED_NO_ANSWER",
  "CALLED_INTERESTED",
  "CALLED_NOT_INTERESTED",
  "FOLLOWUP_SCHEDULED",
  "LOST",
];

const emptyForm = { remark: "", outcome: "CALLED_INTERESTED", nextFollowupDate: "" };

// The call log itself is embedded in the field lead detail fetch (not a
// separate resource like NotesPanel's notes) — this just renders it and owns
// the "Log a Call" form, invalidating the parent detail/list/stats queries
// on success since a call always updates the lead's callStatus/lastCallDate too.
export function FieldLeadCallLogPanel({ fieldLeadId, callLogs }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.post(`/admin/field-leads/${fieldLeadId}/call-log`, {
        remark: form.remark || undefined,
        outcome: form.outcome,
        nextFollowupDate: form.nextFollowupDate || undefined,
      }),
    onSuccess: () => {
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["admin-field-lead", fieldLeadId] });
      queryClient.invalidateQueries({ queryKey: ["admin-field-leads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-field-lead-stats"] });
    },
  });

  return (
    <div className="card">
      <h2 className="font-semibold text-ink">Log a Call</h2>
      <form
        className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="sm:col-span-3">
          <label className="label">Remark</label>
          <textarea rows="2" className="input" placeholder="What was discussed…" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
        </div>
        <div>
          <label className="label">Outcome</label>
          <select className="input" value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })}>
            {CALL_OUTCOMES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Next Follow-up Date</label>
          <input type="date" className="input" value={form.nextFollowupDate} onChange={(e) => setForm({ ...form, nextFollowupDate: e.target.value })} />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Logging…" : "Log Call"}
          </button>
        </div>
      </form>
      {mutation.isError && <p className="mt-2 text-sm text-red-600">{apiErrorMessage(mutation.error)}</p>}

      <div className="mt-6 border-t border-gray-100 pt-4">
        <h3 className="text-sm font-semibold uppercase text-gray-400">Call History</h3>
        {callLogs?.length ? (
          <ul className="mt-3 space-y-3">
            {callLogs.map((log) => (
              <li key={log.id} className="rounded-lg bg-offwhite p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <StatusChip status={log.outcome} />
                  <span className="text-xs text-gray-400">
                    {log.calledBy?.name ?? "Admin"} · {new Date(log.callDate).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                {log.remark && <p className="mt-2 text-ink">{log.remark}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-gray-400">No calls logged yet.</p>
        )}
      </div>
    </div>
  );
}
