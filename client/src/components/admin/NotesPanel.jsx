import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminClient.js";
import { apiErrorMessage } from "../../api/client.js";
import { AsyncState } from "../ui/AsyncState.jsx";

// Reused for both Bookings and Leads — a timestamped, multi-entry admin note
// log (never shown to the customer/lead). entityType/entityId identify which
// record the notes belong to; see AdminNote in schema.prisma.
export function NotesPanel({ entityType, entityId }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const query = useQuery({
    queryKey: ["admin-notes", entityType, entityId],
    queryFn: () => adminApi.get("/admin/notes", { params: { entityType, entityId } }).then((r) => r.data.notes),
  });

  const mutation = useMutation({
    mutationFn: () => adminApi.post("/admin/notes", { entityType, entityId, body }),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["admin-notes", entityType, entityId] });
    },
  });

  return (
    <div>
      <h3 className="font-semibold text-ink">Internal Notes <span className="font-normal text-xs text-gray-400">(admin-only)</span></h3>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) mutation.mutate();
        }}
      >
        <input
          className="input"
          placeholder="Add a note…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" className="btn-secondary shrink-0 text-sm" disabled={mutation.isPending || !body.trim()}>
          {mutation.isPending ? "Adding…" : "Add"}
        </button>
      </form>
      {mutation.isError && <p className="mt-1 text-xs text-red-600">{apiErrorMessage(mutation.error)}</p>}

      <div className="mt-4">
        <AsyncState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          onRetry={query.refetch}
          isEmpty={query.data?.length === 0}
          emptyMessage="No notes yet."
        >
          <ul className="space-y-3">
            {query.data?.map((note) => (
              <li key={note.id} className="rounded-lg bg-offwhite p-3 text-sm">
                <p className="text-ink">{note.body}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {note.author?.name ?? "Admin"} · {new Date(note.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </p>
              </li>
            ))}
          </ul>
        </AsyncState>
      </div>
    </div>
  );
}
