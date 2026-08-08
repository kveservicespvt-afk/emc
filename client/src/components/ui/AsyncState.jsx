// Shared loading/empty/error wrapper so every data-fetching screen behaves the
// same way instead of re-implementing the pattern (Section 5B).
export function AsyncState({ isLoading, isError, error, isEmpty, emptyMessage, onRetry, children }) {
  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl2 bg-gray-200/70" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card border border-red-100 bg-red-50 text-center">
        <p className="font-medium text-red-700">
          {error?.response?.data?.error?.message || error?.message || "Couldn't load this. Please try again."}
        </p>
        {onRetry && (
          <button className="btn-secondary mt-4" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="card text-center text-gray-500">
        <p>{emptyMessage || "Nothing here yet."}</p>
      </div>
    );
  }

  return children;
}
