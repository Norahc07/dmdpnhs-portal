"use client";

import { ATTENDANCE_STATUS_META } from "@/lib/attendance";
import { cn } from "@/lib/utils";

function rateTone(rate) {
  if (rate >= 75) return "text-emerald-700";
  if (rate >= 50) return "text-amber-600";
  return "text-rose-700";
}

function StatCard({ label, value, tone }) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center rounded-2xl border border-[#800000]/10 bg-white px-2 py-3 text-center shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] transition hover:border-[#800000]/15 sm:px-3 sm:py-4">
      <p className="text-[10px] font-semibold tracking-wide text-[#800000]/70 uppercase sm:text-[11px]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-heading text-xl font-bold leading-none sm:text-2xl",
          tone
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function AttendanceStatCards({ stats }) {
  const rate = stats?.rate || 0;

  return (
    <div
      className="grid w-full grid-cols-4 gap-2 sm:gap-3"
      style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
    >
      <StatCard label="Present" value={stats?.present || 0} tone="text-emerald-700" />
      <StatCard label="Tardy" value={stats?.tardy || 0} tone="text-amber-700" />
      <StatCard label="Absent" value={stats?.absent || 0} tone="text-rose-700" />
      <StatCard
        label="Attendance rate"
        value={`${rate}%`}
        tone={rateTone(rate)}
      />
    </div>
  );
}

export function AttendanceLegend() {
  const items = [
    {
      key: "present",
      label: "Present (all subjects)",
      ...ATTENDANCE_STATUS_META.present,
    },
    {
      key: "late",
      label: "Tardy (often 1st subject)",
      ...ATTENDANCE_STATUS_META.late,
    },
    {
      key: "excused",
      label: "Excused (some/all periods)",
      ...ATTENDANCE_STATUS_META.excused,
    },
    {
      key: "absent",
      label: "Absent (unexcused)",
      ...ATTENDANCE_STATUS_META.absent,
    },
  ];

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-[#3d1212]">
        Calendar day color (whole day)
      </p>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {items.map((item) => (
          <li key={item.key} className="inline-flex items-center gap-1.5">
            <span
              className={cn("size-2.5 shrink-0 rounded-full", item.dot)}
              aria-hidden
            />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
