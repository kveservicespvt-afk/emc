import { Link } from "react-router-dom";
import { usePageContent } from "../hooks/usePageContent.js";

const FALLBACK = {
  hero: "A diagnostic check-up for your solar plant — ₹299 to ₹999 depending on system size — that tells you exactly how much output you're losing to soiling, and whether anything electrical needs attention.",
  checks: [
    "Soiling loss % (PR-ratio assessment)",
    "Visual panel inspection for cracks/hotspots",
    "Connection & inverter checkup",
    "Optional thermal imaging",
    "Net-meter / generation reading log",
  ],
};

export function HealthAudit() {
  const content = usePageContent("health-audit", FALLBACK);

  return (
    <div className="section">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-ink">Technical Health Audit</h1>
          <p className="mt-4 text-gray-600">{content.hero}</p>

          <ul className="mt-6 space-y-3">
            {content.checks.map((c) => (
              <li key={c} className="flex items-start gap-3 text-gray-700">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest">
                  &#10003;
                </span>
                {c}
              </li>
            ))}
          </ul>

          <Link to="/book?serviceId=audit" className="btn-primary mt-8 inline-flex">
            Book an Audit
          </Link>
        </div>

        <div className="card">
          <h3 className="font-semibold text-ink">Sample Digital Report Preview</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">Pre-clean PR Ratio</span>
              <span className="font-semibold text-ink">78.4%</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">Post-clean PR Ratio</span>
              <span className="font-semibold text-ink">83.1%</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">Estimated Soiling Loss</span>
              <span className="font-semibold text-maroon">4.7%</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500">Connection Check</span>
              <span className="font-semibold text-forest">All OK</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Recommendation</span>
              <span className="font-semibold text-ink">Standard AMC (Quarterly)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
