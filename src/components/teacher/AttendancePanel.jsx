"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Circle, Moon, Pencil, ShieldCheck, Triangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { markAttendance } from "@/actions/portal";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const OPTIONS = [
  {
    value: "present",
    label: "Present",
    icon: Circle,
    iconClass: "fill-emerald-500 text-emerald-600",
    activeClass: "border-emerald-400 bg-emerald-50 hover:bg-emerald-100",
  },
  {
    value: "absent",
    label: "Absent",
    icon: Triangle,
    iconClass: "fill-red-500 text-red-600",
    activeClass: "border-red-400 bg-red-50 hover:bg-red-100",
  },
  {
    value: "late",
    label: "Tardy",
    icon: Moon,
    iconClass: "fill-amber-400 text-amber-500",
    activeClass: "border-amber-400 bg-amber-50 hover:bg-amber-100",
  },
  {
    value: "excused",
    label: "Excused",
    icon: ShieldCheck,
    iconClass: "text-sky-600",
    activeClass: "border-sky-400 bg-sky-50 hover:bg-sky-100",
  },
];

function formatDisplayDate(date) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

export function AttendancePanel({
  students,
  sectionId,
  date,
  subjectId = null,
  initialMap,
  sectionLabel = "",
  subjectLabel = "",
}) {
  const [map, setMap] = useState(initialMap || {});
  const [editing, setEditing] = useState({});
  const [pending, startTransition] = useTransition();

  function setStatus(studentId, status) {
    const previous = map[studentId];
    setMap((prev) => ({ ...prev, [studentId]: status }));
    setEditing((prev) => ({ ...prev, [studentId]: false }));
    startTransition(async () => {
      try {
        const result = await markAttendance({
          studentId,
          sectionId,
          date,
          status,
          subjectId,
        });
        if (result?.error) {
          setMap((prev) => ({ ...prev, [studentId]: previous }));
          toast.error(result.error);
          return;
        }
        if (status === "absent") {
          toast.message("Absence recorded — SMS alert queued to parent.");
        } else if (status === "excused") {
          toast.success("Marked excused (blue).");
        } else {
          toast.success("Attendance saved");
        }
      } catch {
        setMap((prev) => ({ ...prev, [studentId]: previous }));
        toast.error(
          "Could not reach the server. Wait a moment and mark again."
        );
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <div className="portal-panel-head border-b border-[#800000]/10 px-4 py-3 sm:px-5">
        <p className="text-[11px] font-semibold tracking-wide text-[#800000] uppercase">
          Attendance roster
        </p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-base font-bold text-[#3d1212] sm:text-lg">
            {sectionLabel || "Section"}
            {subjectLabel ? (
              <span className="font-medium text-muted-foreground">
                {" "}
                · {subjectLabel}
              </span>
            ) : null}
          </h2>
          <p className="text-sm font-semibold text-[#3d1212]">
            {formatDisplayDate(date)}
          </p>
        </div>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">{date}</p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#800000]/10 bg-[#800000]/5 hover:bg-[#800000]/5">
              <TableHead className="text-[#3d1212]">Learner</TableHead>
              <TableHead className="text-[#3d1212]">LRN</TableHead>
              <TableHead className="text-[#3d1212]">Status</TableHead>
              <TableHead className="text-right text-[#3d1212]">Mark</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-20 text-center text-muted-foreground"
                >
                  No students in this section.
                </TableCell>
              </TableRow>
            )}
            {students.map((s) => {
              const status = map[s.id];
              const showPicker = !status || editing[s.id];
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-[#3d1212]">
                    {s.profiles?.last_name}, {s.profiles?.first_name}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {s.lrn}
                  </TableCell>
                  <TableCell>
                    {status ? (
                      <StatusBadge status={status} />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Not marked
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {showPicker ? (
                      <div className="inline-flex flex-wrap justify-end gap-1">
                        {OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <Button
                              key={opt.value}
                              size="icon-xs"
                              variant="outline"
                              disabled={pending}
                              aria-label={opt.label}
                              title={opt.label}
                              className={cn(
                                status === opt.value && opt.activeClass
                              )}
                              onClick={() => setStatus(s.id, opt.value)}
                            >
                              <Icon className={opt.iconClass} />
                            </Button>
                          );
                        })}
                      </div>
                    ) : (
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          setEditing((prev) => ({ ...prev, [s.id]: true }))
                        }
                      >
                        <Pencil />
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
