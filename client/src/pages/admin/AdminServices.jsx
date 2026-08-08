import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { apiErrorMessage } from "../../api/client.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";

const CATEGORIES = ["CLEANING", "AMC", "AUDIT", "RESTORATION"];

const emptyForm = { name: "", description: "", basePrice: "", pricePerKw: "0", category: "CLEANING", features: "" };

export function AdminServices() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  const query = useQuery({
    queryKey: ["admin-services"],
    queryFn: () => adminApi.get("/admin/services").then((r) => r.data.services),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-services"] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        description: form.description,
        basePrice: Number(form.basePrice),
        pricePerKw: Number(form.pricePerKw || 0),
        category: form.category,
        featuresJson: form.features.split("\n").map((f) => f.trim()).filter(Boolean),
      };
      return editingId
        ? adminApi.patch(`/admin/services/${editingId}`, payload)
        : adminApi.post("/admin/services", payload);
    },
    onSuccess: () => {
      invalidate();
      closeForm();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }) => adminApi.patch(`/admin/services/${id}`, { active }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.delete(`/admin/services/${id}`),
    onSuccess: invalidate,
    onError: (err) => alert(apiErrorMessage(err)),
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(service) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description,
      basePrice: String(service.basePrice),
      pricePerKw: String(service.pricePerKw),
      category: service.category,
      features: (service.featuresJson ?? []).join("\n"),
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
        <h1 className="text-2xl font-bold text-ink">Services</h1>
        <button className="btn-primary text-sm" onClick={openCreate}>+ New Service</button>
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
          <h2 className="font-semibold text-ink">{editingId ? "Edit Service" : "New Service"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Base Price (₹)</label>
              <input type="number" className="input" required value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
            </div>
            <div>
              <label className="label">Price per kW (₹)</label>
              <input type="number" className="input" value={form.pricePerKw} onChange={(e) => setForm({ ...form, pricePerKw: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows="2" className="input" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Features (one per line — shown as bullets on the public Services page)</label>
            <textarea rows="4" className="input" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
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
                  <th className="py-2">Category</th>
                  <th className="py-2">Price</th>
                  <th className="py-2">Active</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="py-3 font-medium">{s.name}</td>
                    <td className="py-3 text-gray-500">{s.category}</td>
                    <td className="py-3">₹{s.basePrice} + ₹{s.pricePerKw}/kW</td>
                    <td className="py-3">
                      <button
                        onClick={() => toggleActiveMutation.mutate({ id: s.id, active: !s.active })}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${s.active ? "bg-forest/10 text-forest" : "bg-gray-100 text-gray-500"}`}
                      >
                        {s.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-3 space-x-3">
                      <button className="text-forest hover:underline" onClick={() => openEdit(s)}>Edit</button>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => {
                          if (confirm(`Delete "${s.name}"? This only works if it has no bookings.`)) {
                            deleteMutation.mutate(s.id);
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
