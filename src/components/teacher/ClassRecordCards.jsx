"use client";

import Link from "next/link";
import {
  BookOpenCheck,
  ChevronRight,
  GraduationCap,
  School,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GRADE_TERMS, termShortLabel } from "@/lib/grades-terms";
import { GRADE_WORKFLOW, GRADE_WORKFLOW_LABELS } from "@/lib/grade-workflow";
import { cn } from "@/lib/utils";

function termStatusLabel(status) {
  if (!status) return "Not started";
  return GRADE_WORKFLOW_LABELS[status] || status;
}

function termBadgeClass(status) {
  if (!status) return "border-[#800000]/15 bg-[#800000]/5 text-[#800000]";
  if (status === GRADE_WORKFLOW.LOCKED) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (
    status === GRADE_WORKFLOW.UNDER_REVIEW ||
    status === GRADE_WORKFLOW.SUBMITTED
  ) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  if (status === GRADE_WORKFLOW.ENDORSED) {
    return "border-violet-200 bg-violet-50 text-violet-800";
  }
  if (status === GRADE_WORKFLOW.RETURNED) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  return "border-sky-200 bg-sky-50 text-sky-800";
}

export function ClassRecordCards({ groups = [] }) {
  if (!groups.length) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[#800000]/20 bg-white px-6 text-center shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#800000]/8 text-[#800000] ring-1 ring-[#800000]/12">
          <BookOpenCheck className="size-7" />
        </span>
        <h2 className="font-heading text-lg font-bold text-[#3d1212]">
          No assigned class records
        </h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Class-record cards will appear after the registrar assigns you to a
          section and subject. Create a separate workbook for 1st, 2nd, and
          Final Semestral Grade each school year.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {groups.map((group) => (
        <section
          key={group.section.id}
          className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]"
        >
          <div className="portal-panel-head flex items-start justify-between gap-3 p-5">
            <div className="flex gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000] ring-1 ring-[#800000]/12">
                <School className="size-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-lg font-bold text-[#3d1212]">
                    Grade {group.section.grade_level} ·{" "}
                    {group.section.section_name}
                  </h2>
                  {group.isAdvisory ? (
                    <Badge className="bg-[#ffd700]/25 text-[#6a4d00] hover:bg-[#ffd700]/25">
                      <ShieldCheck className="size-3" />
                      Advisory
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  School Year {group.section.school_year}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              {group.studentCount}
            </span>
          </div>

          <div className="divide-y divide-[#800000]/8">
            {group.assignments.map((assignment) => {
              const recordsByTerm = assignment.recordsByTerm || {};
              return (
                <div key={assignment.id} className="px-5 py-4">
                  <div className="mb-3 flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#800000]/8 text-[#800000] ring-1 ring-[#800000]/10">
                      <GraduationCap className="size-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#3d1212]">
                        {assignment.subjects?.subject_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {assignment.subjects?.track_strand ||
                          "Core Subject (All Tracks)"}{" "}
                        · create one class record per semestral term
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {GRADE_TERMS.map((term) => {
                      const status = recordsByTerm[term.value] || null;
                      const hasRecord = Boolean(status);
                      return (
                        <Link
                          key={term.value}
                          href={`/teacher/gradebook/${assignment.id}?term=${term.value}`}
                          className="group rounded-xl border border-[#800000]/10 bg-[#faf7f5]/70 p-3 transition hover:border-[#800000]/25 hover:bg-[#800000]/5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-[#3d1212]">
                              {termShortLabel(term.value)}
                            </p>
                            <ChevronRight className="size-3.5 shrink-0 text-[#800000] transition group-hover:translate-x-0.5" />
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "mt-2 px-1.5 py-0 text-[9px]",
                              termBadgeClass(status)
                            )}
                          >
                            {hasRecord
                              ? termStatusLabel(status)
                              : "New class record"}
                          </Badge>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
