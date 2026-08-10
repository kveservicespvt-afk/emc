// Shared viewport-boundary logic for the fixed-position admin table popovers
// (StatusPopover, FieldLeadStatusLogPopover). Their naive position — anchored
// just below the trigger — can push tall content past the bottom of the
// viewport with no way to scroll to it, since `position: fixed` doesn't move
// with page scroll. Call this after the popover has rendered (so its real
// height is known) to flip it above the trigger when it doesn't fit below,
// and clamp both axes so it's never off-screen.
export function clampPopoverPosition(triggerRect, popoverRect, margin = 8) {
  const { innerWidth, innerHeight } = window;

  let top = triggerRect.bottom + 4;
  if (top + popoverRect.height > innerHeight - margin) {
    const above = triggerRect.top - popoverRect.height - 4;
    top = above >= margin ? above : Math.max(margin, innerHeight - popoverRect.height - margin);
  }

  let left = triggerRect.left;
  if (left + popoverRect.width > innerWidth - margin) {
    left = Math.max(margin, innerWidth - popoverRect.width - margin);
  }

  return { top, left };
}
