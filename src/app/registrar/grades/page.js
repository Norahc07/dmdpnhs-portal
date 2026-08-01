import { AppShell } from "@/components/layout/AppShell";
import { GradeValidationQueue } from "@/components/grades/GradeValidationQueue";
import { requireRole } from "@/lib/auth-guard";
import { mapValidationItem } from "@/lib/grade-validation-data";
import { GRADE_WORKFLOW } from "@/lib/grade-workflow";

export const metadata = { title: "Grade Lock / Publish" };

export default async function RegistrarGradesPage() {
  const { supabase, profile } = await requireRole("registrar");

  const { data: records } = await supabase
    .from("class_records")
    .select(
      `
      id,
      assignment_id,
      workflow_status,
      review_notes,
      submitted_at,
      locked_at,
      data,
      teacher_assignments (
        id,
        school_year,
        sections ( section_name, grade_level, school_year ),
        subjects ( subject_name, written_weight, performance_weight, assessment_weight ),
        teachers ( id, profiles ( first_name, last_name ) )
      )
    `
    )
    .in("workflow_status", [
      GRADE_WORKFLOW.SUBMITTED,
      GRADE_WORKFLOW.UNDER_REVIEW,
      GRADE_WORKFLOW.ENDORSED,
      GRADE_WORKFLOW.LOCKED,
      GRADE_WORKFLOW.RETURNED,
    ])
    .order("updated_at", { ascending: false });

  const items = (records || []).map((r) =>
    mapValidationItem({
      assignment_id: r.assignment_id,
      teacher_assignments: r.teacher_assignments,
      class_records: r,
    })
  );

  const awaitingLock = items.filter(
    (i) =>
      i.workflow_status === GRADE_WORKFLOW.ENDORSED ||
      i.workflow_status === GRADE_WORKFLOW.SUBMITTED
  );
  const locked = items.filter(
    (i) => i.workflow_status === GRADE_WORKFLOW.LOCKED
  );

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Grade lock & publish"
      subtitle="After department head endorsement, lock class records so students and parents can see official grades."
    >
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 font-heading text-lg font-bold text-[#3d1212]">
            Awaiting lock ({awaitingLock.length})
          </h2>
          <GradeValidationQueue items={awaitingLock} mode="registrar" />
        </section>
        <section>
          <h2 className="mb-3 font-heading text-lg font-bold text-[#3d1212]">
            Locked ({locked.length})
          </h2>
          <GradeValidationQueue items={locked} mode="registrar" />
        </section>
      </div>
    </AppShell>
  );
}
