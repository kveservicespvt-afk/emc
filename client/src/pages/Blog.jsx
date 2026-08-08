import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, resolveMediaUrl } from "../api/client.js";
import { AsyncState } from "../components/ui/AsyncState.jsx";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";

export function Blog() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page")) || 1;
  const category = params.get("category") || "";

  useDocumentMeta({
    title: "Blog — EaseMyClean",
    description: "Tips, guides, and updates on solar panel cleaning, maintenance, and getting the most out of your solar investment.",
  });

  const query = useQuery({
    queryKey: ["blog", page, category],
    queryFn: () => api.get("/blog", { params: { page, category: category || undefined } }).then((r) => r.data),
  });

  function setCategory(cat) {
    const next = new URLSearchParams(params);
    if (cat) next.set("category", cat); else next.delete("category");
    next.delete("page");
    setParams(next);
  }

  function goToPage(p) {
    const next = new URLSearchParams(params);
    next.set("page", p);
    setParams(next);
  }

  const categories = [...new Set((query.data?.posts ?? []).map((p) => p.category).filter(Boolean))];

  return (
    <div className="section">
      <h1 className="text-center text-4xl font-extrabold text-ink">EaseMyClean Blog</h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-gray-600">
        Tips, guides, and updates on solar panel cleaning and maintenance.
      </p>

      {categories.length > 0 && (
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button onClick={() => setCategory("")} className={`rounded-full px-4 py-1.5 text-sm font-medium ${!category ? "bg-forest text-white" : "bg-gray-100 text-gray-600"}`}>
            All
          </button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${category === c ? "bg-forest text-white" : "bg-gray-100 text-gray-600"}`}>
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="mt-10">
        <AsyncState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          onRetry={query.refetch}
          isEmpty={query.data?.posts.length === 0}
          emptyMessage="No blog posts published yet — check back soon."
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {query.data?.posts.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="card overflow-hidden !p-0 transition hover:-translate-y-1 hover:shadow-soft">
                {post.featuredImageUrl && (
                  <img src={resolveMediaUrl(post.featuredImageUrl)} alt={post.title} className="aspect-video w-full object-cover" />
                )}
                <div className="p-5">
                  {post.category && <span className="text-xs font-semibold uppercase text-forest">{post.category}</span>}
                  <h2 className="mt-1 font-bold text-ink">{post.title}</h2>
                  {post.excerpt && <p className="mt-2 line-clamp-3 text-sm text-gray-600">{post.excerpt}</p>}
                  <p className="mt-3 text-xs text-gray-400">
                    {post.publishedAt && new Date(post.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {post.authorName}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {query.data?.totalPages > 1 && (
            <div className="mt-10 flex justify-center gap-2">
              {Array.from({ length: query.data.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`h-9 w-9 rounded-full text-sm font-medium ${p === page ? "bg-forest text-white" : "bg-gray-100 text-gray-600"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </AsyncState>
      </div>
    </div>
  );
}
