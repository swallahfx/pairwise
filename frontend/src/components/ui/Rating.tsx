export function Rating({
  avgRating,
  reviewCount,
  size = "text-sm"
}: {
  avgRating?: number | null;
  reviewCount?: number;
  size?: string;
}) {
  if (!avgRating || !reviewCount) {
    return <span className={`text-ink-muted ${size}`}>No reviews yet</span>;
  }
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${size}`}>
      <span className="text-amber-500">★</span>
      {avgRating.toFixed(1)}
      <span className="text-ink-muted font-normal">
        ({reviewCount} review{reviewCount === 1 ? "" : "s"})
      </span>
    </span>
  );
}
