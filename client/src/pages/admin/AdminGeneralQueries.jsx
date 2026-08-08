import { LeadsListView } from "../../components/admin/LeadsListView.jsx";

export function AdminGeneralQueries() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">General Queries</h1>
      <p className="mt-1 text-sm text-gray-500">Leads submitted via the Contact Us page.</p>
      <div className="mt-6">
        <LeadsListView leadType="GENERAL" />
      </div>
    </div>
  );
}
