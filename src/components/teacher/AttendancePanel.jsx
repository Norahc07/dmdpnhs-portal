"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Circle, Moon, Pencil, Triangle } from "lucide-react";
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
    label: "Late",
    icon: Moon,
    iconClass: "fill-orange-400 text-orange-500",
    activeClass: "border-orange-400 bg-orange-50 hover:bg-orange-100",
  },
];

export function AttendancePanel({ students, sectionId, date, initialMap }) {
  const [map, setMap] = useState(initialMap || {});
  const [editing, setEditing] = useState({});
  const [pending, startTransition] = useTransition();

  function setStatus(studentId, status) {
    setMap((prev) => ({ ...prev, [studentId]: status }));
    setEditing((prev) => ({ ...prev, [studentId]: false }));
    startTransition(async () => {
      const result = await markAttendance({
        studentId,
        sectionId,
        date,
        status,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (status === "absent") {
        toast.message("Absence recorded — SMS alert queued to parent.");
      } else {
        toast.success("Attendance saved");
      }
    });
  }

  return (
    <div className="rounded-xl border border-[#800000]/10 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#800000]/5">
            <TableHead>Learner</TableHead>
            <TableHead>LRN</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Mark</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                No students in this section.
              </TableCell>
            </TableRow>
          )}
          {students.map((s) => {
            const status = map[s.id];
            const showPicker = !status || editing[s.id];
            return (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  {s.profiles?.last_name}, {s.profiles?.first_name}
                </TableCell>
                <TableCell className="text-muted-foreground">{s.lrn}</TableCell>
                <TableCell>
                  {status ? (
                    <StatusBadge status={status} className="capitalize" />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Not marked
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {showPicker ? (
                    <div className="inline-flex gap-1">
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
  );
}
