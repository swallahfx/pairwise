// A small numbered pager — Prev / page numbers (with ellipses once there
// are many) / Next. Kept dumb and controlled: the caller owns `page` state
// and slices its own data, this just renders the control and reports clicks.
export function Pagination({
  page,
  totalPages,
  onChange
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-2 text-sm font-semibold rounded-lg border border-border disabled:opacity-30 hover:bg-ground"
      >
        Prev
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm text-ink-muted">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-9 h-9 text-sm font-semibold rounded-lg ${
              p === page ? "bg-gradient-to-r from-accent to-accent-teal text-white" : "border border-border hover:bg-ground"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-2 text-sm font-semibold rounded-lg border border-border disabled:opacity-30 hover:bg-ground"
      >
        Next
      </button>
    </div>
  );
}
