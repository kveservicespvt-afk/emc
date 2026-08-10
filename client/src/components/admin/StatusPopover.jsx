import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { clampPopoverPosition } from "../../lib/popoverPosition.js";
import { StatusChip } from "../ui/StatusChip.jsx";

// Click-to-edit wrapper around StatusChip for admin tables — avoids needing to
// open a detail page just to change a booking's status. Uses fixed positioning
// (viewport-relative) for the dropdown so it isn't clipped by the table's
// overflow-x-auto wrapper, regardless of which row it's opened from.
export function StatusPopover({ status, options, onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (popoverRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Re-measure once the popover has actually rendered and re-anchor it —
  // flipping above the trigger or clamping — if the naive below-trigger
  // placement would run off the viewport. Runs before paint so there's no
  // visible jump. (Short option lists rarely hit this, but nothing stops a
  // long `options` list or a low row from doing so.)
  useLayoutEffect(() => {
    if (!open || !popoverRef.current || !triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    setCoords(clampPopoverPosition(triggerRect, popoverRect));
  }, [open]);

  function handleTriggerClick() {
    if (disabled) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, left: rect.left });
    setOpen((prev) => !prev);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="cursor-pointer disabled:cursor-not-allowed"
        onClick={handleTriggerClick}
        disabled={disabled}
      >
        <StatusChip status={status} />
      </button>

      {open && coords && (
        <div
          ref={popoverRef}
          className="fixed z-50 min-w-[10rem] rounded-lg border border-gray-100 bg-white p-1 shadow-lg"
          style={{ top: coords.top, left: coords.left }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-offwhite ${opt === status ? "font-semibold text-forest" : "text-ink"}`}
              onClick={() => {
                setOpen(false);
                if (opt !== status) onSelect(opt);
              }}
            >
              {opt.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
