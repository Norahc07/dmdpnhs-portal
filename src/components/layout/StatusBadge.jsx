import { STATUS_BADGE_STYLES } from "@/lib/constants";
import { attendanceLabel } from "@/lib/attendance";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }) {
  const isAttendance = ["present", "absent", "late", "excused", "tardy"].includes(
    status
  );
  const normalized = status === "tardy" ? "late" : status;
  const label = isAttendance ? attendanceLabel(normalized) : status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
        STATUS_BADGE_STYLES[normalized] ||
          STATUS_BADGE_STYLES[status] ||
          "bg-muted text-muted-foreground",
        className
      )}
    >
      {label}
    </span>
  );
}
