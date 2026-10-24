import Link from "next/link";
import { ATTENDANCE_STATUS_META, attendanceLabel } from "@/lib/attendance";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export function SecretarySectionHistory({
  date,
  students = [],
  statusByStudent = {},
  sectionLabel = "",
  subjectLabel = "",
  updateHref,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <div className="portal-panel-head flex flex-wrap items-start justify-between gap-2 border-b border-[#800000]/10 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-[#800000] uppercase">
            Section history
          </p>
          <h2 className="mt-1 font-heading text-base font-bold text-[#3d1212] sm:text-lg">
            {sectionLabel}
            {subjectLabel ? (
              <span className="font-medium text-muted-foreground">
                {" "}
                · {subjectLabel}
              </span>
            ) : null}
          </h2>
          <p className="mt-0.5 text-sm text-[#3d1212]">
            {formatDisplayDate(date)}
          </p>
        </div>
        {updateHref ? (
          <Link
            href={updateHref}
            className="rounded-lg bg-[#800000] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6a0000]"
          >
            Update attendance
          </Link>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#800000]/10 bg-[#800000]/5 hover:bg-[#800000]/5">
              <TableHead className="text-[#3d1212]">Learner</TableHead>
              <TableHead className="text-[#3d1212]">LRN</TableHead>
              <TableHead className="text-[#3d1212]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  No students in this section.
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => {
                const status = statusByStudent[student.id] || null;
                const meta = status ? ATTENDANCE_STATUS_META[status] : null;
                return (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium text-[#3d1212]">
                      {student.profiles?.last_name}, {student.profiles?.first_name}
                    </TableCell>
                    <TableCell>{student.lrn}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                          meta?.chip ||
                            "border-neutral-200 bg-neutral-100 text-neutral-600"
                        )}
                      >
                        {status ? attendanceLabel(status) : "Not marked"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
