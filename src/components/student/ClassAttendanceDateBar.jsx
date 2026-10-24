"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function buildHref({ date, subjectId, basePath }) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (subjectId) params.set("subjectId", subjectId);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function ClassAttendanceDateBar({
  date,
  subjects = [],
  subjectId = "",
  hideHomeroom = false,
  basePath = "/student/class-attendance",
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onDateChange(nextDate) {
    if (!nextDate) return;
    startTransition(() => {
      router.push(buildHref({ date: nextDate, subjectId, basePath }));
    });
  }

  const chips = [
    ...(hideHomeroom ? [] : [{ id: "", label: "Daily / Homeroom" }]),
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
          Your assigned section only
        </p>
      </div>

      {chips.length > 1 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-[#800000] uppercase">
            {hideHomeroom ? "Term 2 attendance subjects" : "Subject period"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => {
              const active = (subjectId || "") === (chip.id || "");
              return (
                <Link
                  key={chip.id || "homeroom"}
                  href={buildHref({ date, subjectId: chip.id, basePath })}
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
