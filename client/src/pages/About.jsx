import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client.js";
import { AsyncState } from "../components/ui/AsyncState.jsx";
import { SopStepper } from "../components/home/SopStepper.jsx";
import { usePageContent } from "../hooks/usePageContent.js";

const FALLBACK = {
  mission:
    "EaseMyClean Pvt. Ltd. is on a mission to maximize the life and power output of every solar asset we touch. We connect customers with trained, verified technicians for government-guideline compliant cleaning, restoration, and technical maintenance of solar panels and renewable energy systems.",
  problem:
    "Solar assets in India routinely lose 30-50% of their output to dust and soiling. The cleaning market that serves them is fragmented and unorganized — no verified professionals, no standardized pricing, and no digital tracking of service quality. EaseMyClean fixes that with a managed marketplace, an SOP-compliant process, and full digital reporting on every visit.",
  leaders: [
    { name: "Arvind Singla", title: "Director", bio: "Brings a strong background in business strategy and operations, guiding EaseMyClean's long-term growth and governance as part of the Board of Directors." },
    { name: "Lokesh Singla", title: "Director", bio: "Focused on building sustainable, scalable business operations, contributing strategic oversight and industry experience to EaseMyClean's leadership." },
    { name: "Keshav Singla", title: "Director & Group Operations Head, EaseMyClean", bio: "Leads day-to-day operations, growth strategy, and partnerships for EaseMyClean, reporting into the Board of Directors. Keshav is the operational driving force behind the company — from technician training and SOP compliance to expanding EaseMyClean into new cities — and is the primary point of contact for customers and partners." },
  ],
  milestones: [
    { label: "SOP finalized (MNRE/SECI RE/SPC/001/2024 aligned)", status: "completed" },
    { label: "Technician training & PPE certification program launched", status: "completed" },
    { label: "Pilot cleaning operations in Hisar", status: "completed" },
    { label: "Digital booking & reporting platform launch", status: "upcoming" },
    { label: "Expansion to Chandigarh & Panchkula", status: "upcoming" },
    { label: "NCR market entry", status: "upcoming" },
  ],
};

export function About() {
  const content = usePageContent("about", FALLBACK);
  const citiesQuery = useQuery({
    queryKey: ["cities"],
    queryFn: () => api.get("/cities").then((r) => r.data.cities),
  });

  return (
    <div>
      <section className="section">
        <h1 className="text-4xl font-extrabold text-ink">About EaseMyClean</h1>
        <p className="mt-4 max-w-3xl text-gray-600">{content.mission}</p>
      </section>

      <section className="section bg-white">
        <h2 className="text-2xl font-bold text-ink">The Problem We're Solving</h2>
        <p className="mt-3 max-w-3xl text-gray-600">{content.problem}</p>
      </section>

      <section className="section">
        <h2 className="text-center text-2xl font-bold text-ink">Our Leadership</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {content.leaders.map((leader) => (
            <div key={leader.name} className="card text-center">
              <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-forest to-forest-light" />
              <h3 className="mt-4 font-bold text-ink">{leader.name}</h3>
              <p className="text-sm font-medium text-maroon">{leader.title}</p>
              <p className="mt-3 text-sm text-gray-600">{leader.bio}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section bg-white">
        <h2 className="text-center text-2xl font-bold text-ink">Our Standard SOP Process</h2>
        <div className="mt-10">
          <SopStepper />
        </div>
      </section>

      <section className="section">
        <h2 className="text-center text-2xl font-bold text-ink">Milestones &amp; Traction</h2>
        <div className="mx-auto mt-10 max-w-2xl space-y-3">
          {content.milestones.map((m) => (
            <div key={m.label} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  m.status === "completed" ? "bg-forest" : "bg-gold"
                }`}
              />
              <span className="flex-1 text-sm text-gray-700">{m.label}</span>
              <span
                className={`text-xs font-semibold uppercase ${
                  m.status === "completed" ? "text-forest" : "text-gold"
                }`}
              >
                {m.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section bg-white text-center">
        <h2 className="text-2xl font-bold text-ink">Where We Operate</h2>
        <div className="mx-auto mt-8 max-w-2xl">
          <AsyncState
            isLoading={citiesQuery.isLoading}
            isError={citiesQuery.isError}
            error={citiesQuery.error}
            onRetry={citiesQuery.refetch}
            isEmpty={citiesQuery.data?.length === 0}
            emptyMessage="City coverage details coming soon."
          >
            <div className="flex flex-wrap justify-center gap-3">
              {citiesQuery.data?.map((city) => (
                <span
                  key={city.id}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    city.status === "LIVE" ? "bg-forest/10 text-forest" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {city.name}, {city.state}
                  {city.status !== "LIVE" && <span className="ml-2 text-xs text-gold">Coming Soon</span>}
                </span>
              ))}
            </div>
          </AsyncState>
        </div>
      </section>
    </div>
  );
}
