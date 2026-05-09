import { cn } from "@/lib/utils";
import type { EventStatus } from "@/types";

const STATUS_STYLES: Record<EventStatus, string> = {
  draft: "bg-text-muted/10 text-text-secondary",
  published: "bg-ayo-gold/10 text-ayo-gold",
  live: "bg-red-500/10 text-red-400 animate-pulse",
  ended: "bg-text-muted/10 text-text-muted",
  cancelled: "bg-red-500/5 text-red-400/70 line-through",
};

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Draft",
  published: "Published",
  live: "● Live",
  ended: "Ended",
  cancelled: "Cancelled",
};

export function EventStatusPill({
  status,
  className,
}: {
  status: EventStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
