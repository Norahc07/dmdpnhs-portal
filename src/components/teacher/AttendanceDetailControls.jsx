"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function buildAttendanceUrl({ sealedToken, date, subjectId }) {
  const params = new URLSearchParams();
  if (sealedToken) params.set("s", sealedToken);
  if (date) params.set("date", date);
  if (subjectId) params.set("subjectId", subjectId);
  return `/teacher/attendance?${params.toString()}`;
}

/**
 * Date + optional subject period chips (no dropdowns).
 */
export function AttendanceDetailControls({
  sealedToken,
  date,
  subjects = [],
  subjectId = "",
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onDateChange(nextDate) {
    if (!nextDate) return;
    const href = buildAttendanceUrl({
      sealedToken,
      date: nextDate,
      subjectId,
    });
    startTransition(() => {
      try {
        router.push(href);
      } catch {
        window.location.assign(href);
      }
    });
  }

  const periodChips = [
    { id: "", label: "Daily / Homeroom" },
    ...subjects.map((s) => ({
      id: s.id,
      label: s.subject_name || "Subject",
    })),
  ];

  return (
    <div className="space-y-3 rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-[#800000] uppercase">
            Attendance date
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <CalendarDays className="size-4 text-[#800000]" />
            <Input
              type="date"
              value={date}
              disabled={pending}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-auto min-w-44"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {periodChips.length > 1 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-[#800000] uppercase">
            Subject period
          </p>
          <div className="flex flex-wrap gap-1.5">
            {periodChips.map((chip) => {
              const active = (subjectId || "") === (chip.id || "");
              return (
                <Link
                  key={chip.id || "homeroom"}
                  href={buildAttendanceUrl({
                    sealedToken,
                    date,
                    subjectId: chip.id,
                  })}
                  className={cn(
                    "rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition",
                    active
                      ? "bg-[#800000]/10 text-[#800000] ring-[#800000]/15"
                      : "bg-[#faf7f5] text-muted-foreground ring-[#800000]/10 hover:text-[#800000]"
                  )}
                >
                  {chip.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
