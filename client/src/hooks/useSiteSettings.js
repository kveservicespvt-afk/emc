import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client.js";

// Matches the seeded defaults so the footer/contact page never render blank
// while the query is loading.
const FALLBACK = {
  contactEmail: "contact@easemyclean.com",
  contactPhone: "+91 90500 92092",
  whatsappNumber: "919050092092",
  addressLine: "Hisar, Haryana – 125001, India",
};

export function useSiteSettings() {
  const query = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => api.get("/settings").then((r) => r.data.settings),
    staleTime: 5 * 60 * 1000,
  });

  return { ...FALLBACK, ...query.data };
}
