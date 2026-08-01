import { STATUS_BADGE_STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        STATUS_BADGE_STYLES[status] || "bg-muted text-muted-foreground",
        className
      )}
    >
      {status}
    </span>
  );
}
