import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client.js";

// Fetches a PageContent row and merges over the given fallback so pages never
// render blank while loading (or before the row has been created).
export function usePageContent(slug, fallback) {
  const query = useQuery({
    queryKey: ["page-content", slug],
    queryFn: () => api.get(`/page-content/${slug}`).then((r) => r.data.page),
    staleTime: 5 * 60 * 1000,
  });

  return { ...fallback, ...(query.data?.contentJson ?? {}) };
}
