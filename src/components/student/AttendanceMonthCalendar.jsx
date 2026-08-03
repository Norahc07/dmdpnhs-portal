"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  ATTENDANCE_STATUS_META,
  buildMonthGrid,
  groupAttendanceByDate,
  monthLabel,
  todayDateKey,
} from "@/lib/attendance";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Calendar = date filter. Each day is ONE solid color for the whole day:
 * green present · orange tardy · blue excused · red absent.
 */
export function AttendanceMonthCalendar({
  records = [],
  month,
  year,
  onMonthChange,
  selectedDate,
  onSelectDate,
}) {
  const [localMonth, setLocalMonth] = useState(month);
  const [localYear, setLocalYear] = useState(year);

  const m = onMonthChange ? month : localMonth;
  const y = onMonthChange ? year : localYear;
  const today = todayDateKey();

  const daysByDate = useMemo(() => {
    const grouped = groupAttendanceByDate(records);
    return Object.fromEntries(grouped.map((d) => [d.date, d]));
  }, [records]);

  const cells = useMemo(() => buildMonthGrid(m, y), [m, y]);

  function shift(delta) {
    let nextM = m + delta;
    let nextY = y;
    if (nextM < 1) {
      nextM = 12;
      nextY -= 1;
    } else if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    if (onMonthChange) onMonthChange(nextM, nextY);
    else {
      setLocalMonth(nextM);
      setLocalYear(nextY);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <div className="portal-panel-head flex items-center justify-between gap-2 px-3 py-3 sm:px-4">
        <div className="min-w-0">
          <h3 className="font-heading text-base font-bold text-[#3d1212]">
            {monthLabel(m, y)}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Tap a day to open that day&apos;s subject history. Color = whole-day
            status.
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="border-[#800000]/15 transition hover:bg-[#800000]/8"
            aria-label="Previous month"
            onClick={() => shift(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            className="border-[#800000]/15 transition hover:bg-[#800000]/8"
            aria-label="Next month"
            onClick={() => shift(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="p-3 sm:p-4">

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          if (cell.empty) {
            return <div key={cell.key} className="h-10 sm:h-11" />;
          }

          const dayData = daysByDate[cell.date];
          const summary = dayData?.summaryStatus;
          const meta = summary ? ATTENDANCE_STATUS_META[summary] : null;
          const selected = selectedDate === cell.date;
          const isToday = cell.date === today;
          const isFuture = cell.date > today;

          return (
            <button
              key={cell.key}
              type="button"
              disabled={isFuture && !dayData}
              onClick={() => {
                if (isFuture && !dayData) return;
                onSelectDate?.(cell.date, dayData || null);
              }}
              className={cn(
                "flex h-10 items-center justify-center rounded-lg border text-xs font-semibold transition sm:h-11 sm:text-sm",
                selected
                  ? "ring-2 ring-[#800000]/30 ring-offset-1"
                  : "hover:brightness-95",
                !meta &&
                  "border-[#800000]/08 bg-[#faf7f5] text-[#3d1212] hover:border-[#800000]/20 hover:bg-white",
                isToday && !selected && "border-[#800000]",
                isFuture && !dayData && "cursor-default opacity-40"
              )}
              style={
                meta
                  ? {
                      backgroundColor: meta.color,
                      borderColor: meta.color,
                      color: "#fff",
                    }
                  : undefined
              }
              aria-label={`${cell.date}${summary ? `, ${meta.label}` : ""}`}
              title={
                meta
                  ? `${meta.label} — tap to view subjects`
                  : "No attendance yet"
              }
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      </div>
    </section>
  );
}
