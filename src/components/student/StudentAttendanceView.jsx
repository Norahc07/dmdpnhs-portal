"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AttendanceStatCards,
  AttendanceLegend,
} from "@/components/student/AttendanceStatCards";
import { AttendanceMonthCalendar } from "@/components/student/AttendanceMonthCalendar";
import { AttendanceHistoryTable } from "@/components/student/AttendanceHistoryTable";
import {
  defaultHistoryDate,
  todayDateKey,
} from "@/lib/attendance";

export function StudentAttendanceView({
  initialMonth,
  initialYear,
  days,
  stats,
  records,
  isDemo = false,
  allowExcuse = true,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const month = Number(searchParams.get("month")) || initialMonth;
  const year = Number(searchParams.get("year")) || initialYear;

  const initialDate = useMemo(
    () => defaultHistoryDate(days, todayDateKey()),
    // Only seed once from first days payload for this mount/month
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month, year, days]
  );

  const [selectedDate, setSelectedDate] = useState(initialDate);

  // When a new school day starts (or month data reloads), reset history to today.
  useEffect(() => {
    setSelectedDate(defaultHistoryDate(days, todayDateKey()));
  }, [days, month, year]);

  const selectedDay = useMemo(
    () => days.find((d) => d.date === selectedDate) || null,
    [days, selectedDate]
  );

  function goMonth(nextMonth, nextYear) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", String(nextMonth));
    params.set("year", String(nextYear));
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-4">
      {isDemo ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-xs text-amber-950 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.2)]">
          Showing <span className="font-semibold">sample demo data</span>.
          Calendar colors: green = all present, orange = tardy, blue = excused,
          red = absent. History shows one day at a time.
        </div>
      ) : null}

      <AttendanceStatCards stats={stats} />
      <AttendanceLegend />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <AttendanceMonthCalendar
          records={records}
          month={month}
          year={year}
          onMonthChange={goMonth}
          selectedDate={selectedDate}
          onSelectDate={(date) => setSelectedDate(date)}
        />

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
              Daily detail
            </p>
            <h3 className="mt-1 font-heading text-base font-bold text-[#3d1212]">
              Attendance history
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              All subjects for the selected day. Use the calendar to check past
              days. Resets to today on a new school day.
            </p>
          </div>
          <AttendanceHistoryTable
            day={selectedDay}
            selectedDate={selectedDate}
            allowExcuse={allowExcuse}
          />
        </div>
      </div>
    </div>
  );
}
