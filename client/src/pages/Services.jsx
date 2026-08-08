import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { AsyncState } from "../components/ui/AsyncState.jsx";

// Just an anchor id per category so Home's service cards can deep-link here —
// the actual "what's included" bullets now come from the admin-editable
// Service.featuresJson (Section 5.9: pricing/content should be DB-driven, not hardcoded).
const CATEGORY_ANCHORS = {
  CLEANING: "cleaning",
  AMC: "amc",
  AUDIT: "audit",
  RESTORATION: "restoration",
};

export function Services() {
  const query = useQuery({
    queryKey: ["services"],
    queryFn: () => api.get("/services").then((r) => r.data.services),
  });

  return (
    <div className="section">
      <h1 className="text-4xl font-extrabold text-ink">Our Services</h1>
      <p className="mt-3 max-w-2xl text-gray-600">
        Every service follows the MNRE/SECI Standard Operating Procedure (RE/SPC/001/2024) — trained technicians, demineralized water, and full digital reporting.
      </p>

      <div className="mt-10">
        <AsyncState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          onRetry={query.refetch}
          isEmpty={query.data?.length === 0}
          emptyMessage="No services available right now."
        >
          <div className="space-y-6">
            {query.data?.map((service) => {
              const anchor = CATEGORY_ANCHORS[service.category] ?? "cleaning";
              const features = service.featuresJson ?? [];
              return (
                <div key={service.id} id={anchor} className="card flex flex-col gap-6 md:flex-row md:items-center">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-ink">{service.name}</h2>
                    <p className="mt-2 text-gray-600">{service.description}</p>
                    <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {features.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="mt-1 text-forest">&#10003;</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="shrink-0 text-center md:w-48">
                    <p className="text-sm text-gray-500">Starting at</p>
                    <p className="text-2xl font-extrabold text-forest">₹{service.basePrice}</p>
                    <p className="text-xs text-gray-400">+ ₹{service.pricePerKw}/kW</p>
                    <Link to={`/book?serviceId=${service.id}`} className="btn-primary mt-4 w-full">
                      Book This Service
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </AsyncState>
      </div>
    </div>
  );
}
