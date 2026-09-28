export function Money({ kobo, size = "text-3xl" }: { kobo: number; size?: string }) {
  const naira = (kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: kobo % 100 === 0 ? 0 : 2
  });
  return <span className={`font-display font-bold leading-none ${size}`}>₦{naira}</span>;
}
