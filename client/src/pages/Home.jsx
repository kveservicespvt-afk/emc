import { Link } from "react-router-dom";
import { SopStepper } from "../components/home/SopStepper.jsx";
import { RoiCalculator } from "../components/home/RoiCalculator.jsx";
import { BeforeAfterSlider } from "../components/home/BeforeAfterSlider.jsx";
import { TestimonialCarousel } from "../components/home/TestimonialCarousel.jsx";

const PROBLEMS = [
  { title: "Significant Energy Loss", desc: "Dust and soiling can cut output by 30-50% if panels go uncleaned." },
  { title: "Unorganized Service Market", desc: "No standardized pricing, no verified professionals, no accountability." },
  { title: "Ineffective & Unsustainable Methods", desc: "Tap water and improper tools leave residue and waste water." },
  { title: "Risk of Damage", desc: "Untrained cleaning can scratch glass and void manufacturer warranties." },
  { title: "Lack of Visibility & Monitoring", desc: "Owners rarely know their actual generation loss from soiling." },
  { title: "Trust & Transparency Deficit", desc: "No digital proof of work done, or of the water/methods used." },
];

const TRUST_BADGES = [
  "Up to 30% Efficiency Recovery",
  "Prolongs Panel Life",
  "Lower Bills, Higher Savings",
  "Eco-Friendly & Water Responsible",
  "Safe, Insured & Fully Compliant",
];

const SERVICES = [
  { title: "Rooftop Solar Cleaning", desc: "Residential & Commercial", to: "/services#cleaning" },
  { title: "Annual Maintenance Contracts", desc: "Monthly / Quarterly plans", to: "/amc-plans" },
  { title: "Technical Health Audits", desc: "PR-ratio & inspection reports", to: "/health-audit" },
  { title: "Premium Deep Cleaning", desc: "Stain removal, zero-scratch", to: "/services#restoration" },
];

const WHY_US = [
  { title: "Govt. Guideline Compliant", desc: "Follows MNRE/SECI SOP and IEC 61724-1." },
  { title: "Trained & Verified Experts", desc: "PPE certified per IS 2925 / IS 4770." },
  { title: "Eco-Friendly & Safe", desc: "DM water, zero chemical residue." },
  { title: "DC Isolation Safety", desc: "Full electrical isolation before every visit." },
];

export function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-forest-dark via-forest to-forest-light text-white">
        <div className="section relative grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
              Losing up to 30% power to dust? Get your solar panels professionally cleaned.
            </h1>
            <p className="mt-5 text-lg text-white/85">
              MNRE-guideline compliant, government SOP-certified cleaning &amp; health checkup services.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/book" className="btn-gold">Book Now</Link>
              <a href="#roi-calculator" className="btn-secondary !border-white !text-white hover:!bg-white hover:!text-forest">
                Calculate Your Savings
              </a>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="aspect-square w-full overflow-hidden rounded-xl2 bg-white/10 shadow-2xl ring-1 ring-white/20">
              <img
                src="/hero-clean-panel.png"
                alt="Freshly cleaned solar panel, glossy and dust-free"
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Problem statement */}
      <section className="section">
        <h2 className="text-center text-3xl font-bold text-ink">The Problem With Solar O&amp;M Today</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="card">
              <h3 className="font-semibold text-maroon">{p.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-xl2 bg-maroon px-6 py-5 text-center text-lg font-semibold text-white">
          Dirty panels today, lost savings tomorrow.
        </div>
      </section>

      {/* Our Solution */}
      <section className="section bg-white">
        <h2 className="text-center text-3xl font-bold text-ink">Government Guideline Compliant. Professionals You Trust.</h2>
        <div className="mt-12">
          <SopStepper />
        </div>
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {TRUST_BADGES.map((b) => (
            <span key={b} className="rounded-full bg-gold/15 px-4 py-2 text-sm font-medium text-maroon">
              {b}
            </span>
          ))}
        </div>
      </section>

      {/* Services grid */}
      <section className="section">
        <h2 className="text-center text-3xl font-bold text-ink">Our Services</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <Link key={s.title} to={s.to} className="card transition hover:-translate-y-1 hover:shadow-soft">
              <h3 className="font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{s.desc}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-forest">Learn more &rarr;</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Why choose us */}
      <section className="section bg-white">
        <h2 className="text-center text-3xl font-bold text-ink">Why Choose Us</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_US.map((w) => (
            <div key={w.title} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest/10 text-forest">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h3 className="mt-3 font-semibold text-ink">{w.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="section">
        <RoiCalculator />
      </section>

      {/* Before/After */}
      <section className="section bg-white">
        <h2 className="text-center text-3xl font-bold text-ink">See the Difference</h2>
        <div className="mt-10">
          <BeforeAfterSlider />
        </div>
      </section>

      {/* Testimonials */}
      <section className="section">
        <h2 className="text-center text-3xl font-bold text-ink">What Our Customers Say</h2>
        <div className="mt-10">
          <TestimonialCarousel />
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-maroon py-16 text-center text-white">
        <h2 className="text-3xl font-bold">Ready to boost your panel performance?</h2>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link to="/book" className="btn-gold">Book Now</Link>
          <a href="https://wa.me/919050092092" target="_blank" rel="noopener noreferrer" className="btn-secondary !border-white !text-white hover:!bg-white hover:!text-maroon">
            Chat on WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}
