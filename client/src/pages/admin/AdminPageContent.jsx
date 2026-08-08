import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { apiErrorMessage } from "../../api/client.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";

function leadersToText(leaders) {
  return (leaders ?? []).map((l) => `${l.name}|${l.title}|${l.bio}`).join("\n");
}
function textToLeaders(text) {
  return text.split("\n").map((line) => line.split("|")).filter((p) => p.length >= 3 && p[0].trim())
    .map(([name, title, ...bio]) => ({ name: name.trim(), title: title.trim(), bio: bio.join("|").trim() }));
}
function milestonesToText(milestones) {
  return (milestones ?? []).map((m) => `${m.label}|${m.status}`).join("\n");
}
function textToMilestones(text) {
  return text.split("\n").map((line) => line.split("|")).filter((p) => p.length >= 2 && p[0].trim())
    .map(([label, status]) => ({ label: label.trim(), status: status.trim() || "upcoming" }));
}
function linesToArray(text) {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

export function AdminPageContent() {
  const [tab, setTab] = useState("about");

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Page Content</h1>
      <p className="mt-1 text-gray-500">Edit copy shown on the public About Us and Health Audit pages.</p>

      <div className="mx-auto mt-6 flex w-fit rounded-full bg-gray-100 p-1">
        {[["about", "About Us"], ["health-audit", "Health Audit"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${tab === key ? "bg-forest text-white" : "text-gray-600"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "about" ? <AboutEditor /> : <HealthAuditEditor />}
      </div>
    </div>
  );
}

function AboutEditor() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-page-content", "about"],
    queryFn: () => adminApi.get("/page-content/about").then((r) => r.data.page),
  });

  const [form, setForm] = useState({ mission: "", problem: "", leaders: "", milestones: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (query.data?.contentJson) {
      const c = query.data.contentJson;
      setForm({
        mission: c.mission ?? "",
        problem: c.problem ?? "",
        leaders: leadersToText(c.leaders),
        milestones: milestonesToText(c.milestones),
      });
    }
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      adminApi.patch("/admin/page-content/about", {
        contentJson: {
          mission: form.mission,
          problem: form.problem,
          leaders: textToLeaders(form.leaders),
          milestones: textToMilestones(form.milestones),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-page-content", "about"] });
      queryClient.invalidateQueries({ queryKey: ["page-content", "about"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  return (
    <div className="card max-w-2xl">
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error} onRetry={query.refetch}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
          <div>
            <label className="label">Mission Paragraph</label>
            <textarea rows="3" className="input" value={form.mission} onChange={(e) => setForm({ ...form, mission: e.target.value })} />
          </div>
          <div>
            <label className="label">Problem Statement Paragraph</label>
            <textarea rows="3" className="input" value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} />
          </div>
          <div>
            <label className="label">Leadership — one per line: name|title|bio</label>
            <textarea rows="5" className="input font-mono text-xs" value={form.leaders} onChange={(e) => setForm({ ...form, leaders: e.target.value })} />
          </div>
          <div>
            <label className="label">Milestones — one per line: label|status (completed/upcoming)</label>
            <textarea rows="5" className="input font-mono text-xs" value={form.milestones} onChange={(e) => setForm({ ...form, milestones: e.target.value })} />
          </div>
          {saveMutation.isError && <p className="text-sm text-red-600">{apiErrorMessage(saveMutation.error)}</p>}
          {saved && <p className="text-sm text-forest">Saved.</p>}
          <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save About Page"}
          </button>
        </form>
      </AsyncState>
    </div>
  );
}

function HealthAuditEditor() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-page-content", "health-audit"],
    queryFn: () => adminApi.get("/page-content/health-audit").then((r) => r.data.page),
  });

  const [form, setForm] = useState({ hero: "", checks: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (query.data?.contentJson) {
      const c = query.data.contentJson;
      setForm({ hero: c.hero ?? "", checks: (c.checks ?? []).join("\n") });
    }
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      adminApi.patch("/admin/page-content/health-audit", {
        contentJson: { hero: form.hero, checks: linesToArray(form.checks) },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-page-content", "health-audit"] });
      queryClient.invalidateQueries({ queryKey: ["page-content", "health-audit"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  return (
    <div className="card max-w-2xl">
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error} onRetry={query.refetch}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
          <div>
            <label className="label">Hero Paragraph</label>
            <textarea rows="3" className="input" value={form.hero} onChange={(e) => setForm({ ...form, hero: e.target.value })} />
          </div>
          <div>
            <label className="label">What's Checked — one per line</label>
            <textarea rows="6" className="input" value={form.checks} onChange={(e) => setForm({ ...form, checks: e.target.value })} />
          </div>
          {saveMutation.isError && <p className="text-sm text-red-600">{apiErrorMessage(saveMutation.error)}</p>}
          {saved && <p className="text-sm text-forest">Saved.</p>}
          <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save Health Audit Page"}
          </button>
        </form>
      </AsyncState>
    </div>
  );
}
