import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { apiErrorMessage, resolveMediaUrl } from "../../api/client.js";
import { renderMarkdown } from "../../lib/markdown.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";

const emptyForm = {
  title: "", slug: "", excerpt: "", content: "", category: "",
  metaTitle: "", metaDescription: "", authorName: "EaseMyClean Team", status: "DRAFT",
};

export function AdminBlogEditor() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(emptyForm);
  const [showPreview, setShowPreview] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState(null);

  const query = useQuery({
    queryKey: ["admin-blog-post", id],
    queryFn: () => adminApi.get(`/admin/blog/${id}`).then((r) => r.data.post),
    enabled: !isNew,
  });

  useEffect(() => {
    if (query.data) {
      setForm({
        title: query.data.title,
        slug: query.data.slug,
        excerpt: query.data.excerpt ?? "",
        content: query.data.content,
        category: query.data.category ?? "",
        metaTitle: query.data.metaTitle ?? "",
        metaDescription: query.data.metaDescription ?? "",
        authorName: query.data.authorName,
        status: query.data.status,
      });
    }
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      isNew ? adminApi.post("/admin/blog", form) : adminApi.patch(`/admin/blog/${id}`, form),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      if (isNew) {
        navigate(`/admin/blog/${res.data.post.id}`, { replace: true });
      } else {
        queryClient.invalidateQueries({ queryKey: ["admin-blog-post", id] });
      }
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const imageMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append("image", imageFile);
      return adminApi.post(`/admin/blog/${id}/image`, formData, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => {
      setImageFile(null);
      queryClient.invalidateQueries({ queryKey: ["admin-blog-post", id] });
    },
  });

  if (!isNew && query.isLoading) {
    return <div className="section text-center text-gray-500">Loading…</div>;
  }

  return (
    <div>
      <Link to="/admin/blog" className="text-sm text-gray-500 hover:text-forest">&larr; Back to Blog</Link>

      <AsyncState isLoading={false} isError={!isNew && query.isError} error={query.error} onRetry={query.refetch}>
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form
            className="card space-y-4 lg:col-span-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              saveMutation.mutate();
            }}
          >
            <h1 className="text-lg font-bold text-ink">{isNew ? "New Post" : "Edit Post"}</h1>

            <div>
              <label className="label">Title</label>
              <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Slug {isNew && <span className="text-xs text-gray-400">(auto-generated from title if left blank)</span>}</label>
              <input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div>
              <label className="label">Excerpt</label>
              <textarea rows="2" className="input" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label !mb-0">Content (Markdown)</label>
                <button type="button" className="text-xs text-forest hover:underline" onClick={() => setShowPreview((s) => !s)}>
                  {showPreview ? "Edit" : "Preview"}
                </button>
              </div>
              {showPreview ? (
                <div
                  className="input prose mt-1.5 min-h-[220px] max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(form.content) }}
                />
              ) : (
                <textarea rows="12" className="input mt-1.5 font-mono text-sm" required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Category</label>
                <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div>
                <label className="label">Author</label>
                <input className="input" value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Meta Title (SEO)</label>
              <input className="input" value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} />
            </div>
            <div>
              <label className="label">Meta Description (SEO)</label>
              <textarea rows="2" className="input" value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex flex-wrap items-center gap-3">
              <select className="input max-w-xs" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
              <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>

          <div className="card">
            <h2 className="font-semibold text-ink">Featured Image</h2>
            {isNew ? (
              <p className="mt-2 text-sm text-gray-500">Save the post first, then come back here to upload a featured image.</p>
            ) : (
              <>
                {query.data?.featuredImageUrl && (
                  <img src={resolveMediaUrl(query.data.featuredImageUrl)} alt="Featured" className="mt-3 aspect-video w-full rounded-lg object-cover" />
                )}
                <input type="file" accept="image/*" className="mt-3" onChange={(e) => setImageFile(e.target.files[0])} />
                <button
                  type="button"
                  className="btn-secondary mt-3 w-full"
                  onClick={() => imageMutation.mutate()}
                  disabled={!imageFile || imageMutation.isPending}
                >
                  {imageMutation.isPending ? "Uploading…" : "Upload Image"}
                </button>
              </>
            )}
          </div>
        </div>
      </AsyncState>
    </div>
  );
}
