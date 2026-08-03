"use client";

import { useState } from "react";
import {
  ATTENDANCE_STATUS_META,
  attendanceLabel,
} from "@/lib/attendance";
import { ExcuseLetterDialog } from "@/components/student/ExcuseLetterDialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Day-by-day history: shows ALL subjects for the selected date only.
 * Use the calendar to jump to past days.
 */
export function AttendanceHistoryTable({
  day = null,
  selectedDate = null,
  allowExcuse = true,
}) {
  const [excuseTarget, setExcuseTarget] = useState(null);
  const periods = day?.periods || [];
  const isDemoDay = periods.some((p) => p._demo);
  const showActions = allowExcuse;

  const dateLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-PH", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const colSpan = showActions ? 4 : 3;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="portal-panel-head flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-[#800000]/80 uppercase">
              Day history
            </p>
            <p className="font-heading text-sm font-bold text-[#3d1212]">
              {dateLabel}
            </p>
          </div>
          {day?.summaryStatus ? (
            <span
              className={cn(
                "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                ATTENDANCE_STATUS_META[day.summaryStatus]?.chip
              )}
            >
              {attendanceLabel(day.summaryStatus)}
            </span>
          ) : null}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              {showActions ? (
                <TableHead className="text-right">Action</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!selectedDate && (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="h-20 text-center text-muted-foreground"
                >
                  Select a day on the calendar.
                </TableCell>
              </TableRow>
            )}
            {selectedDate && periods.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="h-20 text-center text-muted-foreground"
                >
                  No subject attendance recorded for this day yet.
                </TableCell>
              </TableRow>
            )}
            {periods.map((p, index) => {
              const canExcuse =
                allowExcuse &&
                p.status === "absent" &&
                !p.excuse &&
                !p._demo;
              return (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {p.subjectName || "Homeroom"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                        ATTENDANCE_STATUS_META[p.status]?.chip
                      )}
                    >
                      {attendanceLabel(p.status)}
                    </span>
                    {p.excuse ? (
                      <span className="ml-2 text-[11px] text-muted-foreground">
                        Excuse {p.excuse.status}
                      </span>
                    ) : null}
                  </TableCell>
                  {showActions ? (
                    <TableCell className="text-right">
                      {canExcuse ? (
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => setExcuseTarget(p)}
                        >
                          Submit excuse
                        </Button>
                      ) : isDemoDay && p.status === "absent" ? (
                        <span className="text-[10px] text-muted-foreground">
                          Demo
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {allowExcuse ? (
        <ExcuseLetterDialog
          open={Boolean(excuseTarget)}
          onOpenChange={(open) => {
            if (!open) setExcuseTarget(null);
          }}
          attendance={excuseTarget}
        />
      ) : null}
    </>
  );
}
