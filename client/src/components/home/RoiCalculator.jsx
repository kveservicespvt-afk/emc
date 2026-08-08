import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client.js";

export function RoiCalculator() {
  const [form, setForm] = useState({ plantCapacityKw: "5", avgMonthlyBill: "3000", dustZone: "HIGH" });

  const mutation = useMutation({
    mutationFn: (payload) => api.post("/roi-calculator", payload).then((r) => r.data),
  });

  function handleSubmit(e) {
    e.preventDefault();
    mutation.mutate({
      plantCapacityKw: Number(form.plantCapacityKw),
      avgMonthlyBill: Number(form.avgMonthlyBill),
      dustZone: form.dustZone,
    });
  }

  return (
    <div id="roi-calculator" className="card mx-auto max-w-3xl">
      <h3 className="text-xl font-bold text-ink">Calculate Your Savings</h3>
      <p className="mt-1 text-sm text-gray-500">
        Estimate how much you could save with regular professional cleaning.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="kw">Plant Capacity (kW)</label>
          <input
            id="kw"
            type="number"
            min="0.5"
            step="0.5"
            className="input"
            value={form.plantCapacityKw}
            onChange={(e) => setForm({ ...form, plantCapacityKw: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="bill">Avg. Monthly Bill (₹)</label>
          <input
            id="bill"
            type="number"
            min="0"
            className="input"
            value={form.avgMonthlyBill}
            onChange={(e) => setForm({ ...form, avgMonthlyBill: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="zone">Dust Zone</label>
          <select
            id="zone"
            className="input"
            value={form.dustZone}
            onChange={(e) => setForm({ ...form, dustZone: e.target.value })}
          >
            <option value="HIGH">High (Haryana/Rajasthan)</option>
            <option value="MODERATE">Moderate / Urban</option>
            <option value="LOW">Low / Coastal / Monsoon</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={mutation.isPending}>
            {mutation.isPending ? "Calculating…" : "Calculate Savings"}
          </button>
        </div>
      </form>

      {mutation.isError && (
        <p className="mt-4 text-sm text-red-600">{apiErrorMessage(mutation.error)}</p>
      )}

      {mutation.isSuccess && (
        <div className="mt-6 rounded-xl2 bg-forest/5 p-6 text-center">
          <p className="text-sm text-gray-600">Estimated recoverable loss</p>
          <p className="text-3xl font-extrabold text-forest">{mutation.data.recoverableLossPct}%</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Monthly savings</p>
              <p className="text-xl font-bold text-ink">₹{mutation.data.monthlySavings.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Annual savings</p>
              <p className="text-xl font-bold text-ink">₹{mutation.data.annualSavings.toLocaleString("en-IN")}</p>
            </div>
          </div>
          <Link to="/book" className="btn-gold mt-6 inline-flex">
            Book Now to Start Saving
          </Link>
        </div>
      )}
    </div>
  );
}
