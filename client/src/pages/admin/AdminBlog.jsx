import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { AsyncState } from "../../components/ui/AsyncState.jsx";
import { StatusChip } from "../../components/ui/StatusChip.jsx";

export function AdminBlog() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-blog"],
    queryFn: () => adminApi.get("/admin/blog").then((r) => r.data.posts),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.delete(`/admin/blog/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-blog"] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Blog</h1>
        <Link to="/admin/blog/new" className="btn-primary text-sm">+ New Post</Link>
      </div>

      <div className="card mt-6">
        <AsyncState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          onRetry={query.refetch}
          isEmpty={query.data?.length === 0}
          emptyMessage="No blog posts yet."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400">
                  <th className="py-2">Title</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Updated</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-3">
                      <Link to={`/admin/blog/${p.id}`} className="font-medium text-forest hover:underline">{p.title}</Link>
                    </td>
                    <td className="py-3 text-gray-500">{p.category ?? "—"}</td>
                    <td className="py-3"><StatusChip status={p.status} /></td>
                    <td className="py-3 text-gray-500">{new Date(p.updatedAt).toLocaleDateString("en-IN")}</td>
                    <td className="py-3 space-x-3">
                      <Link to={`/admin/blog/${p.id}`} className="text-forest hover:underline">Edit</Link>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => { if (confirm(`Delete "${p.title}"?`)) deleteMutation.mutate(p.id); }}
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
