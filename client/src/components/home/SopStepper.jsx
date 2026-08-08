const STEPS = [
  { title: "Pre-Inspection", desc: "Visual check of panels, mounting, and wiring before work begins." },
  { title: "Dry Cleaning", desc: "Loose dust and debris removed with soft-bristle brushes." },
  { title: "Approved Cleaning", desc: "DM water (TDS < 50ppm) applied per MNRE/SECI SOP." },
  { title: "Manual Cleaning", desc: "Trained technicians hand-clean each panel — no harsh scrubbing." },
  { title: "Post-Cleaning Inspection", desc: "Panels re-checked for residue, scratches, or damage." },
  { title: "Report & Documentation", desc: "Digital report with readings and before/after photos." },
];

export function SopStepper() {
  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
      {STEPS.map((step, i) => (
        <div key={step.title} className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest text-lg font-bold text-white shadow-soft">
            {i + 1}
          </div>
          <h4 className="mt-3 text-sm font-semibold text-ink">{step.title}</h4>
          <p className="mt-1 text-xs text-gray-500">{step.desc}</p>
        </div>
      ))}
    </div>
  );
}
