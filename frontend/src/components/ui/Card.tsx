export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-card p-6 ${className}`}>
      {children}
    </div>
  );
}
