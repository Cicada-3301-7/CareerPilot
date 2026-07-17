// Generic server-side pagination control. Hidden entirely for single-page
// result sets; buttons stay disabled while the parent is fetching so a
// double-click can't skip pages.
function Pagination({ page, totalPages, loading, onPageChange, label = "Pagination" }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label={label}>
      <button
        className="btn btn-secondary btn-sm"
        type="button"
        disabled={loading || page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ← Previous
      </button>
      <span className="pagination-status" aria-live="polite">
        Page {page} of {totalPages}
      </span>
      <button
        className="btn btn-secondary btn-sm"
        type="button"
        disabled={loading || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next →
      </button>
    </nav>
  );
}

export default Pagination;
