import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-surface border border-border-subtle rounded-card p-5",
        className,
      )}
    >
      <p className="text-text-muted text-xs uppercase tracking-wide">{label}</p>
      <p className="font-display text-3xl font-bold text-white mt-2">{value}</p>
      {hint && <p className="text-text-secondary text-xs mt-1.5">{hint}</p>}
    </div>
  );
}
