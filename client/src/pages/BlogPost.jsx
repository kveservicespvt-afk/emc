import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, resolveMediaUrl } from "../api/client.js";
import { AsyncState } from "../components/ui/AsyncState.jsx";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { renderMarkdown } from "../lib/markdown.js";

export function BlogPost() {
  const { slug } = useParams();
  const query = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: () => api.get(`/blog/${slug}`).then((r) => r.data.post),
  });

  useDocumentMeta({
    title: query.data ? `${query.data.metaTitle || query.data.title} — EaseMyClean Blog` : undefined,
    description: query.data?.metaDescription || query.data?.excerpt,
    image: query.data?.featuredImageUrl ? resolveMediaUrl(query.data.featuredImageUrl) : undefined,
    url: typeof window !== "undefined" ? window.location.href : undefined,
  });

  return (
    <div className="section max-w-3xl">
      <Link to="/blog" className="text-sm text-gray-500 hover:text-forest">&larr; Back to Blog</Link>

      <div className="mt-4">
        <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error} onRetry={query.refetch}>
          {query.data && (
            <article>
              {query.data.category && <span className="text-xs font-semibold uppercase text-forest">{query.data.category}</span>}
              <h1 className="mt-2 text-3xl font-extrabold text-ink sm:text-4xl">{query.data.title}</h1>
              <p className="mt-3 text-sm text-gray-500">
                {query.data.publishedAt && new Date(query.data.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · {query.data.authorName}
              </p>

              {query.data.featuredImageUrl && (
                <img
                  src={resolveMediaUrl(query.data.featuredImageUrl)}
                  alt={query.data.title}
                  className="mt-6 aspect-video w-full rounded-xl2 object-cover shadow-card"
                />
              )}

              <div
                className="prose prose-headings:text-ink prose-a:text-forest mt-8 max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(query.data.content) }}
              />
            </article>
          )}
        </AsyncState>
      </div>
    </div>
  );
}
