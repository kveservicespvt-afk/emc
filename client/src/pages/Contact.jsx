import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, apiErrorMessage } from "../api/client.js";
import { useSiteSettings } from "../hooks/useSiteSettings.js";

export function Contact() {
  const settings = useSiteSettings();
  const [form, setForm] = useState({ name: "", phone: "", plantCapacityKw: "", city: "", message: "" });
  const mutation = useMutation({
    mutationFn: (payload) => api.post("/leads", payload).then((r) => r.data),
  });

  function handleSubmit(e) {
    e.preventDefault();
    mutation.mutate({
      ...form,
      plantCapacityKw: form.plantCapacityKw ? Number(form.plantCapacityKw) : undefined,
      source: "contact_page",
    });
  }

  return (
    <div className="section">
      <h1 className="text-4xl font-extrabold text-ink">Contact Us</h1>
      <p className="mt-3 max-w-2xl text-gray-600">
        Questions about a booking, AMC plan, or partnership? Reach out — we usually respond within a few hours.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="card space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">Phone / WhatsApp</p>
              <a href={`tel:${settings.contactPhone}`} className="text-lg font-semibold text-ink hover:text-forest">{settings.contactPhone}</a>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">Email</p>
              <a href={`mailto:${settings.contactEmail}`} className="text-lg font-semibold text-ink hover:text-forest">{settings.contactEmail}</a>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">Address</p>
              <p className="text-gray-700">{settings.addressLine}</p>
            </div>
            <a
              href={`https://wa.me/${settings.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary !bg-[#25D366] hover:!bg-[#1ebe5b]"
            >
              Chat Instantly on WhatsApp
            </a>
          </div>

          <div className="overflow-hidden rounded-xl2 shadow-card">
            <iframe
              title="EaseMyClean location — Hisar, Haryana"
              src="https://maps.google.com/maps?q=Hisar%2C%20Haryana%20125001&t=&z=12&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="280"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <div className="card">
          {mutation.isSuccess ? (
            <div className="text-center">
              <h3 className="text-lg font-bold text-forest">Thanks, {form.name.split(" ")[0]}!</h3>
              <p className="mt-2 text-gray-600">We've received your message and will get back to you shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="c-name">Name</label>
                <input id="c-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="c-phone">Mobile Number</label>
                <input id="c-phone" className="input" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="c-kw">Plant Capacity (kW)</label>
                  <input id="c-kw" type="number" className="input" value={form.plantCapacityKw} onChange={(e) => setForm({ ...form, plantCapacityKw: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="c-city">City</label>
                  <input id="c-city" className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="c-msg">Message</label>
                <textarea id="c-msg" rows="4" className="input" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </div>
              {mutation.isError && <p className="text-sm text-red-600">{apiErrorMessage(mutation.error)}</p>}
              <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
                {mutation.isPending ? "Sending…" : "Send Message"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
