import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { apiErrorMessage } from "../../api/client.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";

const emptyForm = { name: "", frequencyPerYear: "1", basePrice: "", pricePerKw: "0", includes: "" };

function includesToLines(includesJson) {
  return Object.entries(includesJson ?? {}).map(([k, v]) => `${k}: ${v}`).join("\n");
}

function linesToIncludes(text) {
  const entries = text
    .split("\n")
    .map((line) => line.split(":"))
    .filter((parts) => parts.length >= 2 && parts[0].trim())
    .map(([key, ...rest]) => [key.trim(), rest.join(":").trim()]);
  return Object.fromEntries(entries);
}

export function AdminAmcPlans() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  const query = useQuery({
    queryKey: ["admin-amc-plans"],
    queryFn: () => adminApi.get("/admin/amc-plans").then((r) => r.data.amcPlans),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-amc-plans"] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        frequencyPerYear: Number(form.frequencyPerYear),
        basePrice: Number(form.basePrice),
        pricePerKw: Number(form.pricePerKw || 0),
        includesJson: linesToIncludes(form.includes),
      };
      return editingId
        ? adminApi.patch(`/admin/amc-plans/${editingId}`, payload)
        : adminApi.post("/admin/amc-plans", payload);
    },
    onSuccess: () => {
      invalidate();
      closeForm();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }) => adminApi.patch(`/admin/amc-plans/${id}`, { active }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.delete(`/admin/amc-plans/${id}`),
    onSuccess: invalidate,
    onError: (err) => alert(apiErrorMessage(err)),
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(plan) {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      frequencyPerYear: String(plan.frequencyPerYear),
      basePrice: String(plan.basePrice),
      pricePerKw: String(plan.pricePerKw),
      includes: includesToLines(plan.includesJson),
    });
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">AMC Plans</h1>
        <button className="btn-primary text-sm" onClick={openCreate}>+ New Plan</button>
      </div>

      {showForm && (
        <form
          className="card mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            saveMutation.mutate();
          }}
        >
          <h2 className="font-semibold text-ink">{editingId ? "Edit AMC Plan" : "New AMC Plan"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Name</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Visits per Year</label>
              <input type="number" min="1" className="input" required value={form.frequencyPerYear} onChange={(e) => setForm({ ...form, frequencyPerYear: e.target.value })} />
            </div>
            <div>
              <label className="label">Base Price per Visit (₹)</label>
              <input type="number" className="input" required value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Price per kW (₹)</label>
            <input type="number" className="input" value={form.pricePerKw} onChange={(e) => setForm({ ...form, pricePerKw: e.target.value })} />
          </div>
          <div>
            <label className="label">What's Included (one "label: value" per line)</label>
            <textarea rows="4" className="input" placeholder={"waterQuality: DM water (TDS < 50ppm)\nsafety: Full PPE + DC isolation"} value={form.includes} onChange={(e) => setForm({ ...form, includes: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      <div className="card mt-6">
        <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error} onRetry={query.refetch}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400">
                  <th className="py-2">Name</th>
                  <th className="py-2">Frequency</th>
                  <th className="py-2">Price</th>
                  <th className="py-2">Active</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-3 font-medium">{p.name}</td>
                    <td className="py-3 text-gray-500">{p.frequencyPerYear}x/year</td>
                    <td className="py-3">₹{p.basePrice} + ₹{p.pricePerKw}/kW</td>
                    <td className="py-3">
                      <button
                        onClick={() => toggleActiveMutation.mutate({ id: p.id, active: !p.active })}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${p.active ? "bg-forest/10 text-forest" : "bg-gray-100 text-gray-500"}`}
                      >
                        {p.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-3 space-x-3">
                      <button className="text-forest hover:underline" onClick={() => openEdit(p)}>Edit</button>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => {
                          if (confirm(`Delete "${p.name}"? This only works if it has no bookings/subscriptions.`)) {
                            deleteMutation.mutate(p.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AsyncState>
      </div>
    </div>
  );
}
