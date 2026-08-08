import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { apiErrorMessage } from "../../api/client.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";

const emptyForm = { contactEmail: "", contactPhone: "", whatsappNumber: "", addressLine: "" };

export function AdminSettings() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState(false);

  const query = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => adminApi.get("/settings").then((r) => r.data.settings),
  });

  useEffect(() => {
    if (query.data) {
      setForm({
        contactEmail: query.data.contactEmail,
        contactPhone: query.data.contactPhone,
        whatsappNumber: query.data.whatsappNumber,
        addressLine: query.data.addressLine,
      });
    }
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: () => adminApi.patch("/admin/settings", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Site Settings</h1>
      <p className="mt-1 text-gray-500">Contact details shown across the public site and WhatsApp button.</p>

      <div className="card mt-6 max-w-xl">
        <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error} onRetry={query.refetch}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div>
              <label className="label">Contact Email</label>
              <input type="email" className="input" required value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </div>
            <div>
              <label className="label">Contact Phone (displayed)</label>
              <input className="input" required value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </div>
            <div>
              <label className="label">WhatsApp Number (digits only, with country code — e.g. 919050092092)</label>
              <input className="input" required value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} />
            </div>
            <div>
              <label className="label">Address</label>
              <textarea rows="2" className="input" required value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} />
            </div>
            {saveMutation.isError && <p className="text-sm text-red-600">{apiErrorMessage(saveMutation.error)}</p>}
            {saved && <p className="text-sm text-forest">Saved.</p>}
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save Settings"}
            </button>
          </form>
        </AsyncState>
      </div>
    </div>
  );
}
