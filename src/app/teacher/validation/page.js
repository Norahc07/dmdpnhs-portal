import { AppShell } from "@/components/layout/AppShell";
import { GradeValidationQueue } from "@/components/grades/GradeValidationQueue";
import { requireRole } from "@/lib/auth-guard";
import { mapValidationItem } from "@/lib/grade-validation-data";
import { GRADE_WORKFLOW } from "@/lib/grade-workflow";
import { getTeacherAccess } from "@/lib/teacher-access";

export const metadata = { title: "Grade Validation" };

export default async function TeacherValidationPage() {
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, department_id, faculty_position, departments(name, band)")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!teacherAccess.canValidateGrades) {
    return (
      <AppShell
        role="teacher"
        profile={profile}
        teacherAccess={teacherAccess}
        title="Grade validation"
      >
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Grade validation is available when the registrar assigns you as a
          department head with a department.
        </p>
      </AppShell>
    );
  }

  const { data: peers } = await supabase
    .from("teachers")
    .select("id")
    .eq("department_id", teacher.department_id);

  const peerIds = (peers || []).map((t) => t.id);

  const { data: assignments } = peerIds.length
    ? await supabase
        .from("teacher_assignments")
        .select(
          `
      id,
      school_year,
      teacher_id,
      sections ( section_name, grade_level, school_year ),
      subjects ( subject_name, written_weight, performance_weight, assessment_weight ),
      teachers ( id, profiles ( first_name, last_name ) ),
      class_records ( id, workflow_status, review_notes, submitted_at, data )
    `
        )
        .in("teacher_id", peerIds)
    : { data: [] };

  const items = (assignments || [])
    .map((a) => {
      const record = Array.isArray(a.class_records)
        ? a.class_records[0]
        : a.class_records;
      return mapValidationItem({
        ...a,
        teacher_assignments: a,
        class_records: record,
      });
    })
    .filter((item) => {
      const status = item.workflow_status;
      return (
        status === GRADE_WORKFLOW.SUBMITTED ||
        status === GRADE_WORKFLOW.UNDER_REVIEW ||
        status === GRADE_WORKFLOW.ENDORSED
      );
    });

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
      title="Grade validation"
      subtitle={`${teacher?.departments?.name || "Department"} · review submitted class records before registrar lock`}
    >
      <div className="mb-4 rounded-xl border border-[#800000]/10 bg-[#800000]/5 px-4 py-3 text-sm text-[#3d1212]">
        Check failing learners, return records that need correction, or endorse
        them for the registrar to lock and publish.
      </div>
      <GradeValidationQueue items={items} mode="department" />
    </AppShell>
  );
}
