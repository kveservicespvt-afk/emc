import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client.js";
import { AsyncState } from "../components/ui/AsyncState.jsx";

// Per-tier top accent so all three plans read as distinct choices, not just
// the 3rd "Most Popular" card standing out against two identical ones.
const TIER_ACCENTS = [
  { border: "border-sky", check: "text-sky-dark" },
  { border: "border-forest", check: "text-forest" },
  { border: "border-gold", check: "text-forest" },
];

const FAQS = [
  { q: "What's your cancellation policy?", a: "AMC plans can be cancelled anytime from your dashboard; remaining scheduled visits are simply removed. No cancellation fee." },
  { q: "What water quality do you use?", a: "Demineralized (DM) water with TDS under 50ppm on every visit, per the MNRE/SECI SOP — no tap water, no chemical residue." },
  { q: "Is the crew safety-certified?", a: "Yes — full PPE (helmet IS 2925, gloves IS 4770, harness IS 3521, shoes IS 15298) and DC isolation before every job." },
  { q: "What if a panel is damaged during cleaning?", a: "Every visit includes a pre- and post-inspection. Any pre-existing damage is flagged and photographed before work begins; our technicians follow a zero-scratch protocol." },
];

const COMMERCIAL_BENEFITS = [
  "Custom pricing based on your site's plant capacity and site conditions",
  "Dedicated account manager for multi-site or portfolio clients",
  "Flexible visit frequency — monthly, quarterly, or a schedule you set",
  "Digital before/after reports and PR-ratio tracking across every visit",
];

function CommercialQuoteForm() {
  const [form, setForm] = useState({ name: "", phone: "", city: "", plantCapacityKw: "", message: "" });
  const mutation = useMutation({
    mutationFn: (payload) => api.post("/leads", payload).then((r) => r.data),
  });

  function handleSubmit(e) {
    e.preventDefault();
    mutation.mutate({
      ...form,
      plantCapacityKw: form.plantCapacityKw ? Number(form.plantCapacityKw) : undefined,
      source: "amc_commercial_quote",
      leadType: "COMMERCIAL_QUOTE",
    });
  }

  if (mutation.isSuccess) {
    return (
      <div className="card text-center">
        <p className="font-semibold text-forest">Thanks! Our team will reach out with a custom commercial quote shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h3 className="text-lg font-bold text-ink">Request a Custom Commercial Quote</h3>
      <div>
        <label className="label" htmlFor="cq-name">Name</label>
        <input id="cq-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="cq-phone">Mobile Number</label>
        <input id="cq-phone" className="input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="cq-city">City</label>
        <input id="cq-city" className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="cq-kw">Plant Capacity (kW)</label>
        <input id="cq-kw" type="number" className="input" value={form.plantCapacityKw} onChange={(e) => setForm({ ...form, plantCapacityKw: e.target.value })} />
      </div>
      <div>
        <label className="label" htmlFor="cq-msg">Message</label>
        <textarea id="cq-msg" rows="3" className="input" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </div>
      {mutation.isError && <p className="text-sm text-red-600">{apiErrorMessage(mutation.error)}</p>}
      <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Submitting…" : "Request Quote"}
      </button>
    </form>
  );
}

function CommercialQuoteSection() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold text-ink">Commercial &amp; Multi-Site AMC</h2>
          <p className="mt-3 text-gray-600">
            Running a commercial rooftop, industrial site, or a portfolio of installations? Tell us a bit
            about your setup and we'll put together pricing tailored to it — no fixed tiers.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-gray-700">
            {COMMERCIAL_BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="mt-1 text-forest">&#10003;</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <CommercialQuoteForm />
      </div>
    </div>
  );
}

export function AmcPricing() {
  const [mode, setMode] = useState("residential");
  const query = useQuery({
    queryKey: ["amc-plans"],
    queryFn: () => api.get("/amc-plans").then((r) => r.data.amcPlans),
  });

  return (
    <div className="section">
      <h1 className="text-center text-4xl font-extrabold text-ink">AMC &amp; Pricing</h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-gray-600">
        Choose a one-time clean or a recurring AMC plan. All plans follow the same government-guideline SOP.
      </p>

      <div className="mx-auto mt-8 flex w-fit rounded-full bg-gray-100 p-1">
        {["residential", "commercial"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full px-5 py-2 text-sm font-semibold capitalize transition ${
              mode === m ? "bg-forest text-white" : "text-gray-600"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mt-12">
        {mode === "commercial" ? (
          <CommercialQuoteSection />
        ) : (
          <AsyncState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            onRetry={query.refetch}
            isEmpty={query.data?.length === 0}
            emptyMessage="No AMC plans available right now."
          >
            <div className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-3">
              {query.data?.map((plan, i) => {
                const accent = TIER_ACCENTS[i] ?? TIER_ACCENTS[0];
                return (
                  <div
                    key={plan.id}
                    className={`card flex flex-col border-t-4 p-8 ${accent.border} ${i === 2 ? "shadow-lg ring-1 ring-gold/30" : ""}`}
                  >
                    {i === 2 && (
                      <span className="mb-3 w-fit rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-maroon">
                        Most Popular
                      </span>
                    )}
                    <h3 className="text-xl font-bold text-ink">{plan.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{plan.frequencyPerYear}x per year</p>
                    <p className="mt-4 text-3xl font-extrabold text-forest">
                      ₹{plan.basePrice}
                      <span className="text-sm font-medium text-gray-400"> + ₹{plan.pricePerKw}/kW</span>
                    </p>

                    <ul className="mt-6 flex-1 space-y-3 text-sm text-gray-700">
                      {Object.entries(plan.includesJson ?? {}).map(([key, value]) => (
                        <li key={key} className="flex items-start gap-2">
                          <span className={`mt-1 ${accent.check}`}>&#10003;</span>
                          <span>{value}</span>
                        </li>
                      ))}
                    </ul>

                    <Link to={`/book?amcPlanId=${plan.id}`} className={i === 2 ? "btn-gold mt-8" : "btn-primary mt-8"}>
                      {plan.frequencyPerYear === 1 ? "Book Single Service" : `Choose ${plan.name.split(" ")[0]}`}
                    </Link>
                  </div>
                );
              })}
            </div>
          </AsyncState>
        )}
      </div>

      <div className="mx-auto mt-16 max-w-3xl">
        <h2 className="text-center text-2xl font-bold text-ink">Frequently Asked Questions</h2>
        <div className="mt-6 space-y-3">
          {FAQS.map((faq) => (
            <details key={faq.q} className="card group">
              <summary className="cursor-pointer list-none font-semibold text-ink marker:content-none">
                <span className="flex items-center justify-between">
                  {faq.q}
                  <span className="text-forest transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm text-gray-600">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
