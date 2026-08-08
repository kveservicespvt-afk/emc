import { LeadsListView } from "../../components/admin/LeadsListView.jsx";

export function AdminCommercialQueries() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Commercial Queries</h1>
      <p className="mt-1 text-sm text-gray-500">Custom AMC quote requests from businesses — higher-value B2B interest.</p>
      <div className="mt-6">
        <LeadsListView leadType="COMMERCIAL_QUOTE" showPlantCapacity />
      </div>
    </div>
  );
}
