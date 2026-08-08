import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { apiErrorMessage } from "../../api/client.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";

const emptyForm = { name: "", state: "", status: "UPCOMING", dustZone: "MODERATE" };

export function AdminCities() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  const query = useQuery({
    queryKey: ["admin-cities"],
    queryFn: () => adminApi.get("/admin/cities").then((r) => r.data.cities),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-cities"] });

  const saveMutation = useMutation({
    mutationFn: () =>
      editingId ? adminApi.patch(`/admin/cities/${editingId}`, form) : adminApi.post("/admin/cities", form),
    onSuccess: () => {
      invalidate();
      closeForm();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.delete(`/admin/cities/${id}`),
    onSuccess: invalidate,
    onError: (err) => alert(apiErrorMessage(err)),
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(city) {
    setEditingId(city.id);
    setForm({ name: city.name, state: city.state, status: city.status, dustZone: city.dustZone });
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
        <h1 className="text-2xl font-bold text-ink">Service Areas / Cities</h1>
        <button className="btn-primary text-sm" onClick={openCreate}>+ New City</button>
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
          <h2 className="font-semibold text-ink">{editingId ? "Edit City" : "New City"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">City Name</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="LIVE">Live (bookable)</option>
                <option value="UPCOMING">Upcoming (Coming Soon)</option>
              </select>
            </div>
            <div>
              <label className="label">Dust Zone</label>
              <select className="input" value={form.dustZone} onChange={(e) => setForm({ ...form, dustZone: e.target.value })}>
                <option value="HIGH">High</option>
                <option value="MODERATE">Moderate</option>
                <option value="LOW">Low</option>
              </select>
            </div>
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
                  <th className="py-2">City</th>
                  <th className="py-2">State</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Dust Zone</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="py-3 font-medium">{c.name}</td>
                    <td className="py-3 text-gray-500">{c.state}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${c.status === "LIVE" ? "bg-forest/10 text-forest" : "bg-gold/20 text-maroon"}`}>
                        {c.status === "LIVE" ? "Live" : "Coming Soon"}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">{c.dustZone}</td>
                    <td className="py-3 space-x-3">
                      <button className="text-forest hover:underline" onClick={() => openEdit(c)}>Edit</button>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => {
                          if (confirm(`Delete ${c.name}?`)) deleteMutation.mutate(c.id);
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
