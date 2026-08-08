import { useMemo, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiErrorMessage } from "../../api/client.js";
import { useAuth } from "../../hooks/useAuth.jsx";
import { AsyncState } from "../ui/AsyncState.jsx";

// Mirrors server/src/config.js booking.allowedSlots — the server is the source of
// truth and re-validates; this just keeps the picker honest about what's bookable.
const ALLOWED_SLOTS = [
  { label: "Morning (6 AM – 9 AM)", start: "06:00", end: "09:00" },
  { label: "Evening (4 PM – 6:30 PM)", start: "16:00", end: "18:30" },
];

const STEP_LABELS = ["Select Service", "Site Details", "Date & Slot", "Review & Pay"];

export function BookingWizard() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const [step, setStep] = useState(1);
  const [selection, setSelection] = useState(
    params.get("amcPlanId") ? { type: "amc", id: params.get("amcPlanId") } : params.get("serviceId") ? { type: "service", id: params.get("serviceId") } : null
  );
  const [siteId, setSiteId] = useState(null);
  const [slot, setSlot] = useState({ date: "", start: "", end: "" });
  const [createdBooking, setCreatedBooking] = useState(null);

  if (loading) return <div className="section text-center text-gray-500">Loading…</div>;

  if (!user) {
    return (
      <div className="section flex justify-center">
        <div className="card max-w-md text-center">
          <h2 className="text-xl font-bold text-ink">Log in to book a service</h2>
          <p className="mt-2 text-gray-600">Create an account or log in to continue with your booking.</p>
          <Link to="/login" className="btn-primary mt-6">Log In / Sign Up</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <h1 className="text-center text-3xl font-extrabold text-ink">Book a Service</h1>

      <ol className="mx-auto mt-8 flex max-w-2xl justify-between text-xs sm:text-sm">
        {STEP_LABELS.map((label, i) => (
          <li key={label} className={`flex-1 text-center font-medium ${i + 1 <= step ? "text-forest" : "text-gray-400"}`}>
            <div className={`mx-auto mb-1 h-2 w-2 rounded-full ${i + 1 <= step ? "bg-forest" : "bg-gray-300"}`} />
            {label}
          </li>
        ))}
      </ol>

      <div className="mx-auto mt-10 max-w-2xl">
        {step === 1 && <StepSelectService selection={selection} onSelect={setSelection} onNext={() => setStep(2)} />}
        {step === 2 && <StepSiteDetails siteId={siteId} onSelect={setSiteId} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
        {step === 3 && <StepSlot slot={slot} onChange={setSlot} onBack={() => setStep(2)} onNext={() => setStep(4)} />}
        {step === 4 && !createdBooking && (
          <StepReview
            selection={selection}
            siteId={siteId}
            slot={slot}
            onBack={() => setStep(3)}
            onBooked={setCreatedBooking}
          />
        )}
        {step === 4 && createdBooking && <StepPayment booking={createdBooking} />}
      </div>
    </div>
  );
}

function StepSelectService({ selection, onSelect, onNext }) {
  const servicesQuery = useQuery({ queryKey: ["services"], queryFn: () => api.get("/services").then((r) => r.data.services) });
  const amcQuery = useQuery({ queryKey: ["amc-plans"], queryFn: () => api.get("/amc-plans").then((r) => r.data.amcPlans) });

  const isLoading = servicesQuery.isLoading || amcQuery.isLoading;
  const isError = servicesQuery.isError || amcQuery.isError;

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-ink">What would you like to book?</h2>
      <AsyncState isLoading={isLoading} isError={isError} error={servicesQuery.error || amcQuery.error} onRetry={() => { servicesQuery.refetch(); amcQuery.refetch(); }}>
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-gray-400">One-time services</p>
          {servicesQuery.data?.map((s) => (
            <OptionRow
              key={s.id}
              active={selection?.type === "service" && selection.id === s.id}
              title={s.name}
              subtitle={`₹${s.basePrice} + ₹${s.pricePerKw}/kW`}
              onClick={() => onSelect({ type: "service", id: s.id, data: s })}
            />
          ))}
          <p className="mt-4 text-xs font-semibold uppercase text-gray-400">AMC plans (recurring)</p>
          {amcQuery.data?.map((p) => (
            <OptionRow
              key={p.id}
              active={selection?.type === "amc" && selection.id === p.id}
              title={p.name}
              subtitle={`₹${p.basePrice} + ₹${p.pricePerKw}/kW per visit · ${p.frequencyPerYear}x/year`}
              onClick={() => onSelect({ type: "amc", id: p.id, data: p })}
            />
          ))}
        </div>
      </AsyncState>
      <button className="btn-primary mt-6 w-full" disabled={!selection} onClick={onNext}>
        Continue
      </button>
    </div>
  );
}

function OptionRow({ active, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
        active ? "border-forest bg-forest/5" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <span>
        <span className="block font-medium text-ink">{title}</span>
        <span className="block text-xs text-gray-500">{subtitle}</span>
      </span>
      {active && <span className="text-forest">&#10003;</span>}
    </button>
  );
}

function StepSiteDetails({ siteId, onSelect, onBack, onNext }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", line1: "", city: "", state: "", pincode: "", plantCapacityKw: "", mountType: "ROOFTOP" });

  const sitesQuery = useQuery({ queryKey: ["sites"], queryFn: () => api.get("/sites").then((r) => r.data.sites) });
  const citiesQuery = useQuery({
    queryKey: ["cities", "LIVE"],
    queryFn: () => api.get("/cities?status=LIVE").then((r) => r.data.cities),
  });

  function handleCityChange(cityId) {
    const city = citiesQuery.data?.find((c) => c.id === cityId);
    setForm({ ...form, city: city?.name ?? "", state: city?.state ?? "" });
  }

  const createSite = useMutation({
    mutationFn: () =>
      api
        .post("/sites", {
          label: form.label,
          addressJson: { line1: form.line1, city: form.city, state: form.state, pincode: form.pincode },
          plantCapacityKw: Number(form.plantCapacityKw),
          mountType: form.mountType,
        })
        .then((r) => r.data.site),
    onSuccess: (site) => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      onSelect(site.id);
      setShowForm(false);
    },
  });

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-ink">Where should we clean?</h2>

      <AsyncState isLoading={sitesQuery.isLoading} isError={sitesQuery.isError} error={sitesQuery.error} onRetry={sitesQuery.refetch}>
        <div className="mt-4 space-y-2">
          {sitesQuery.data?.length === 0 && !showForm && (
            <p className="text-sm text-gray-500">No saved sites yet — add your plant details below.</p>
          )}
          {sitesQuery.data?.map((site) => (
            <OptionRow
              key={site.id}
              active={siteId === site.id}
              title={site.label}
              subtitle={`${site.plantCapacityKw} kW · ${site.addressJson?.city ?? ""}`}
              onClick={() => onSelect(site.id)}
            />
          ))}
        </div>
      </AsyncState>

      {!showForm ? (
        <button type="button" className="btn-secondary mt-4 w-full" onClick={() => setShowForm(true)}>
          + Add a New Site
        </button>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createSite.mutate();
          }}
        >
          <input className="input" placeholder="Site label (e.g. Home Rooftop)" required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <input className="input" placeholder="Address line" required value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select
              className="input"
              required
              value={citiesQuery.data?.find((c) => c.name === form.city)?.id ?? ""}
              onChange={(e) => handleCityChange(e.target.value)}
            >
              <option value="" disabled>
                {citiesQuery.isLoading ? "Loading cities…" : "Select a serviceable city"}
              </option>
              {citiesQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}, {c.state}</option>
              ))}
            </select>
            <input className="input bg-gray-50" placeholder="State" required readOnly value={form.state} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Pincode" required value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            <input className="input" type="number" step="0.5" placeholder="Plant capacity (kW)" required value={form.plantCapacityKw} onChange={(e) => setForm({ ...form, plantCapacityKw: e.target.value })} />
          </div>
          <select className="input" value={form.mountType} onChange={(e) => setForm({ ...form, mountType: e.target.value })}>
            <option value="ROOFTOP">Rooftop</option>
            <option value="GROUND">Ground-mount</option>
            <option value="AGRI_KUSUM">Agri / PM-KUSUM</option>
          </select>
          {createSite.isError && <p className="text-sm text-red-600">{apiErrorMessage(createSite.error)}</p>}
          <button type="submit" className="btn-primary w-full" disabled={createSite.isPending}>
            {createSite.isPending ? "Saving…" : "Save Site"}
          </button>
        </form>
      )}

      <div className="mt-6 flex gap-3">
        <button className="btn-secondary flex-1" onClick={onBack}>Back</button>
        <button className="btn-primary flex-1" disabled={!siteId} onClick={onNext}>Continue</button>
      </div>
    </div>
  );
}

function StepSlot({ slot, onChange, onBack, onNext }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-ink">Pick a date &amp; slot</h2>
      <p className="mt-1 text-sm text-gray-500">
        For safety, we don't schedule visits between 11:00 AM and 3:00 PM (peak sun).
      </p>

      <div className="mt-4">
        <label className="label" htmlFor="date">Date</label>
        <input
          id="date"
          type="date"
          className="input"
          min={today}
          value={slot.date}
          onChange={(e) => onChange({ ...slot, date: e.target.value })}
        />
      </div>

      <div className="mt-4 space-y-2">
        {ALLOWED_SLOTS.map((s) => (
          <OptionRow
            key={s.start}
            active={slot.start === s.start}
            title={s.label}
            subtitle=""
            onClick={() => onChange({ ...slot, start: s.start, end: s.end })}
          />
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <button className="btn-secondary flex-1" onClick={onBack}>Back</button>
        <button className="btn-primary flex-1" disabled={!slot.date || !slot.start} onClick={onNext}>Continue</button>
      </div>
    </div>
  );
}

function StepReview({ selection, siteId, slot, onBack, onBooked }) {
  const sitesQuery = useQuery({ queryKey: ["sites"], queryFn: () => api.get("/sites").then((r) => r.data.sites) });
  const site = sitesQuery.data?.find((s) => s.id === siteId);

  const estimatedPrice = useMemo(() => {
    if (!selection?.data || !site) return null;
    return Math.round((selection.data.basePrice + selection.data.pricePerKw * site.plantCapacityKw) * 100) / 100;
  }, [selection, site]);

  const bookMutation = useMutation({
    mutationFn: () => {
      if (selection.type === "service") {
        return api
          .post("/bookings", { siteId, serviceId: selection.id, scheduledDate: slot.date, slotStart: slot.start, slotEnd: slot.end })
          .then((r) => r.data.booking);
      }
      return api
        .post("/subscriptions", { siteId, amcPlanId: selection.id, firstVisitDate: slot.date, slotStart: slot.start, slotEnd: slot.end })
        .then((r) => r.data.firstBooking);
    },
    onSuccess: onBooked,
  });

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-ink">Review your booking</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <Row label={selection.type === "amc" ? "AMC Plan" : "Service"} value={selection?.data?.name} />
        <Row label="Site" value={site ? `${site.label} (${site.plantCapacityKw} kW)` : "—"} />
        <Row label="Date" value={slot.date} />
        <Row label="Slot" value={ALLOWED_SLOTS.find((s) => s.start === slot.start)?.label} />
        <Row label="Estimated Price" value={estimatedPrice != null ? `₹${estimatedPrice}` : "—"} bold />
      </dl>
      <p className="mt-2 text-xs text-gray-400">
        Final price is confirmed server-side at checkout.
        {selection.type === "amc" && " The remaining visits for the year will be auto-scheduled once this AMC is set up."}
      </p>

      {bookMutation.isError && <p className="mt-3 text-sm text-red-600">{apiErrorMessage(bookMutation.error)}</p>}

      <div className="mt-6 flex gap-3">
        <button className="btn-secondary flex-1" onClick={onBack} disabled={bookMutation.isPending}>Back</button>
        <button className="btn-primary flex-1" onClick={() => bookMutation.mutate()} disabled={bookMutation.isPending}>
          {bookMutation.isPending ? "Booking…" : "Confirm & Proceed to Payment"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className={bold ? "font-bold text-forest" : "font-medium text-ink"}>{value}</dd>
    </div>
  );
}

function StepPayment({ booking }) {
  const navigate = useNavigate();
  const [paid, setPaid] = useState(false);

  const orderMutation = useMutation({
    mutationFn: () => api.post("/payments/create-order", { bookingId: booking.id }).then((r) => r.data),
  });

  const payMutation = useMutation({
    mutationFn: (orderId) => api.post("/payments/mock-pay", { bookingId: booking.id, orderId }).then((r) => r.data),
    onSuccess: () => setPaid(true),
  });

  if (paid) {
    return (
      <div className="card text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest/10 text-2xl text-forest">✓</div>
        <h2 className="mt-4 text-xl font-bold text-ink">Booking Confirmed!</h2>
        <p className="mt-2 text-gray-600">We've sent the details to your dashboard. A technician will be assigned shortly.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button className="btn-primary" onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}>
            View Booking
          </button>
          <button className="btn-secondary" onClick={() => navigate("/dashboard/bookings")}>
            My Bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card text-center">
      <h2 className="text-lg font-bold text-ink">Complete Payment</h2>
      <p className="mt-2 text-3xl font-extrabold text-forest">₹{booking.priceAmount}</p>
      <p className="mt-1 text-xs text-gray-400">
        Razorpay isn't live yet — this is a mock checkout so you can see the full booking flow end-to-end.
      </p>

      {!orderMutation.data ? (
        <button className="btn-gold mt-6 w-full" onClick={() => orderMutation.mutate()} disabled={orderMutation.isPending}>
          {orderMutation.isPending ? "Creating order…" : "Pay Now (Mock Razorpay)"}
        </button>
      ) : (
        <button
          className="btn-gold mt-6 w-full"
          onClick={() => payMutation.mutate(orderMutation.data.orderId)}
          disabled={payMutation.isPending}
        >
          {payMutation.isPending ? "Confirming payment…" : "Simulate Successful Payment"}
        </button>
      )}
      {(orderMutation.isError || payMutation.isError) && (
        <p className="mt-3 text-sm text-red-600">{apiErrorMessage(orderMutation.error || payMutation.error)}</p>
      )}
    </div>
  );
}
