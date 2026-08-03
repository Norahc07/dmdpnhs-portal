import { AppShell } from "@/components/layout/AppShell";
import { RegistrarGradesTabs } from "@/components/grades/RegistrarGradesTabs";
import { requireRole } from "@/lib/auth-guard";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import { GRADE_WORKFLOW } from "@/lib/grade-workflow";
import { mapRegistrarGradeItem } from "@/lib/registrar-grades-tree";

export const metadata = { title: "Grade Lock / Publish" };

export default async function RegistrarGradesPage() {
  const { supabase, profile } = await requireRole("registrar");

  const [{ data: records }, { data: sections }, { data: assignments }] =
    await Promise.all([
      supabase
        .from("class_records")
        .select(
          `
          id,
          assignment_id,
          term,
          workflow_status,
          review_notes,
          submitted_at,
          locked_at,
          data,
          teacher_assignments (
            id,
            section_id,
            subject_id,
            school_year,
            sections ( id, section_name, grade_level, school_year, track_strand ),
            subjects ( id, subject_name, written_weight, performance_weight, assessment_weight ),
            teachers ( id, profiles ( first_name, last_name ) )
          )
        `
        )
        .in("workflow_status", [
          GRADE_WORKFLOW.ENDORSED,
          GRADE_WORKFLOW.LOCKED,
        ])
        .order("updated_at", { ascending: false }),
      supabase
        .from("sections")
        .select("id, section_name, grade_level, school_year, track_strand")
        .eq("school_year", SCHOOL_YEAR_DEFAULT)
        .order("grade_level")
        .order("section_name"),
      supabase
        .from("teacher_assignments")
        .select("id, section_id, school_year")
        .eq("school_year", SCHOOL_YEAR_DEFAULT),
    ]);

  const studentIds = new Set();
  for (const r of records || []) {
    const students = r.data?.students || {};
    for (const id of Object.keys(students)) studentIds.add(id);
  }

  let studentDirectory = {};
  if (studentIds.size > 0) {
    const { data: studentRows } = await supabase
      .from("students")
      .select("id, lrn, profiles(first_name, last_name)")
      .in("id", Array.from(studentIds));

    for (const s of studentRows || []) {
      studentDirectory[s.id] = {
        lrn: s.lrn,
        first_name: s.profiles?.first_name,
        last_name: s.profiles?.last_name,
      };
    }
  }

  const items = (records || []).map((r) =>
    mapRegistrarGradeItem(
      {
        assignment_id: r.assignment_id,
        teacher_assignments: r.teacher_assignments,
        class_records: r,
      },
      studentDirectory
    )
  );

  const expectedBySection = {};
  for (const a of assignments || []) {
    if (!a.section_id) continue;
    // Three semestral workbooks expected per subject assignment
    expectedBySection[a.section_id] =
      (expectedBySection[a.section_id] || 0) + 3;
  }

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Grade lock & publish"
      subtitle="Awaiting = validated by department head / committee. Locked = published grades."
    >
      <RegistrarGradesTabs
        items={items}
        sections={sections || []}
        expectedBySection={expectedBySection}
      />
    </AppShell>
  );
}
