import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { apiErrorMessage } from "../../api/client.js";
import { clampPopoverPosition } from "../../lib/popoverPosition.js";
import { StatusChip } from "../ui/StatusChip.jsx";

// CONVERTED is deliberately excluded — that only happens through the real
// Convert-to-AMC flow on the detail page (creates a Subscription/Site/customer),
// not a casual call log. NOT_CALLED isn't a call outcome either.
const CALL_OUTCOMES = [
  "CALLED_NO_ANSWER",
  "CALLED_INTERESTED",
  "CALLED_NOT_INTERESTED",
  "FOLLOWUP_SCHEDULED",
  "LOST",
];

// Same viewport-fixed-positioning/click-outside mechanics as StatusPopover.jsx
// (used on Bookings), but with a small call-log form instead of a plain option
// list — logging a status change here always goes through the real call-log
// endpoint, same as the detail page's "Log a Call" form, just a faster path to it.
export function FieldLeadStatusLogPopover({ fieldLeadId, status }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [outcome, setOutcome] = useState("CALLED_INTERESTED");
  const [remark, setRemark] = useState("");
  const [nextFollowupDate, setNextFollowupDate] = useState("");
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.post(`/admin/field-leads/${fieldLeadId}/call-log`, {
        outcome,
        remark: remark || undefined,
        nextFollowupDate: nextFollowupDate || undefined,
      }),
    onSuccess: () => {
      setOpen(false);
      setRemark("");
      setNextFollowupDate("");
      queryClient.invalidateQueries({ queryKey: ["admin-field-leads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-field-lead-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-field-lead", fieldLeadId] });
    },
  });

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (popoverRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Re-measure once the popover has actually rendered (its height depends on
  // content) and re-anchor it — flipping above the trigger or clamping — if
  // the naive below-trigger placement would run off the viewport. Runs
  // before paint so there's no visible jump.
  useLayoutEffect(() => {
    if (!open || !popoverRef.current || !triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    setCoords(clampPopoverPosition(triggerRect, popoverRect));
  }, [open]);

  function handleTriggerClick() {
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, left: rect.left });
    setOpen((prev) => !prev);
  }

  return (
    <>
      <button ref={triggerRef} type="button" className="cursor-pointer" onClick={handleTriggerClick}>
        <StatusChip status={status} />
      </button>

      {open && coords && (
        <div
          ref={popoverRef}
          className="fixed z-50 w-72 rounded-lg border border-gray-100 bg-white p-3 shadow-lg"
          style={{ top: coords.top, left: coords.left }}
        >
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div>
              <label className="label text-xs">Outcome</label>
              <select className="input text-sm" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                {CALL_OUTCOMES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Remark</label>
              <textarea rows="2" className="input text-sm" placeholder="What was discussed…" value={remark} onChange={(e) => setRemark(e.target.value)} />
            </div>
            <div>
              <label className="label text-xs">Next Follow-up</label>
              <input type="date" className="input text-sm" value={nextFollowupDate} onChange={(e) => setNextFollowupDate(e.target.value)} />
            </div>
            {mutation.isError && <p className="text-xs text-red-600">{apiErrorMessage(mutation.error)}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="text-xs text-gray-500 hover:text-ink" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary px-3 py-1 text-xs" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
