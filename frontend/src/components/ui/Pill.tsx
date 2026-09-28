export function Pill({
  children,
  active = false,
  onClick
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const base = "px-4 py-2 rounded-full text-sm border font-medium";
  const classes = active
    ? `${base} bg-accent text-white border-accent`
    : `${base} bg-surface text-ink border-border`;
  return onClick ? (
    <button onClick={onClick} className={classes}>
      {children}
    </button>
  ) : (
    <span className={classes}>{children}</span>
  );
}
