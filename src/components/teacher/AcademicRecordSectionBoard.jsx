import Link from "next/link";
import { ArrowLeft, ChevronRight, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GRADE_WORKFLOW, GRADE_WORKFLOW_LABELS } from "@/lib/grade-workflow";
import {
  HUMSS_G12_CURRICULUM,
  humssSubjectTerm,
} from "@/lib/humss-academic-record";
import { cn } from "@/lib/utils";

function statusLabel(status) {
  if (!status) return "Not started";
  return GRADE_WORKFLOW_LABELS[status] || status;
}

export function AcademicRecordSectionBoard({
  section,
  assignments = [],
  recordsByAssignment = {},
  teacherId,
}) {
  const byName = new Map();
  for (const assignment of assignments) {
    const name = assignment.subjects?.subject_name;
    if (name) byName.set(String(name).toLowerCase(), assignment);
  }

  return (
    <div className="space-y-5">
      <Link
        href="/teacher/gradebook"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#800000] hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to academic records
      </Link>

      <div className="rounded-2xl border border-[#800000]/10 bg-white px-4 py-3 text-sm shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <p className="font-semibold text-[#3d1212]">
          Grade {section.grade_level} · {section.section_name} · SY{" "}
          {section.school_year}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Grade 12 HUMSS academic record. Term 1, Term 2, and Term 3 stay on
          this page. Encoding a new term does not replace earlier Final Grades
          and Remarks.
        </p>
      </div>

      {HUMSS_G12_CURRICULUM.map((block) => (
        <section
          key={block.term}
          className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]"
        >
          <div className="portal-panel-head px-5 py-4">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#800000] uppercase">
              Academic record
            </p>
            <h2 className="font-heading text-lg font-bold text-[#3d1212]">
              {block.label}
            </h2>
            <p className="text-xs text-muted-foreground">
              Final Grade and Remarks only · {block.subjects.length} subjects
            </p>
          </div>
          <div className="divide-y divide-[#800000]/8">
            {block.subjects.map((name) => {
              const assignment = byName.get(name.toLowerCase());
              const offeredTerm =
                humssSubjectTerm(assignment?.subjects || { subject_name: name }) ||
                block.term;
              const status = assignment
                ? recordsByAssignment[assignment.id]?.[offeredTerm] || null
                : null;
              return (
                <div
                  key={name}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#800000]/8 text-[#800000] ring-1 ring-[#800000]/10">
                      <GraduationCap className="size-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#3d1212]">
                        {name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Final Grade · Remarks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "px-1.5 py-0 text-[9px]",
                        status === GRADE_WORKFLOW.LOCKED
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-[#800000]/15 bg-[#800000]/5 text-[#800000]"
                      )}
                    >
                      {assignment ? statusLabel(status) : "Not assigned"}
                    </Badge>
                    {assignment && assignment.teacher_id === teacherId ? (
                      <Link
                        href={`/teacher/gradebook/${assignment.id}?term=${offeredTerm}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#800000] hover:underline"
                      >
                        Encode
                        <ChevronRight className="size-3.5" />
                      </Link>
                    ) : assignment ? (
                      <span className="text-xs text-muted-foreground">
                        Assigned
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Ask registrar to assign a teacher
                      </span>
                    )}
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
