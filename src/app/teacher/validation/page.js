import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { GradeValidationQueue } from "@/components/teacher/GradeValidationQueue";
import { requireRole } from "@/lib/auth-guard";
import { GRADE_WORKFLOW } from "@/lib/grade-workflow";
import { normalizeGradeTerm, termLabel } from "@/lib/grades-terms";
import { mapRegistrarGradeItem } from "@/lib/registrar-grades-tree";
import { getTeacherAccess } from "@/lib/teacher-access";

export const metadata = { title: "Grade Validation" };

export default async function TeacherValidationPage() {
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);

  if (!teacherAccess.canValidateGrades) {
    redirect("/teacher/gradebook");
  }

  const { data: dept } = await supabase
    .from("departments")
    .select("id, name, grade_level, band")
    .eq("id", teacherAccess.departmentId)
    .maybeSingle();

  const { data: allSubjects } = await supabase
    .from("subjects")
    .select("id, subject_name, department_id, grade_level");

  const subjectIds = (allSubjects || [])
    .filter((s) => {
      if (s.department_id === teacherAccess.departmentId) return true;
      if (
        dept?.name &&
        String(s.subject_name).toLowerCase() ===
          String(dept.name).toLowerCase()
      ) {
        return true;
      }
      return false;
    })
    .map((s) => s.id);

  let items = [];
  if (subjectIds.length) {
    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select("id")
      .in("subject_id", subjectIds);

    const assignmentIds = (assignments || []).map((a) => a.id);
    if (assignmentIds.length) {
      const { data: records } = await supabase
        .from("class_records")
        .select(
          `
          id,
          assignment_id,
          term,
          workflow_status,
          review_notes,
          submitted_at,
          data,
          teacher_assignments (
            id,
            section_id,
            subject_id,
            school_year,
            sections ( id, section_name, grade_level, school_year, track_strand ),
            subjects ( id, subject_name, written_weight, performance_weight, assessment_weight, department_id ),
            teachers ( id, profiles ( first_name, last_name ) )
          )
        `
        )
        .in("assignment_id", assignmentIds)
        .in("workflow_status", [
          GRADE_WORKFLOW.UNDER_REVIEW,
          GRADE_WORKFLOW.SUBMITTED,
        ])
        .order("submitted_at", { ascending: true });

      const studentIds = new Set();
      for (const r of records || []) {
        for (const id of Object.keys(r.data?.students || {})) {
          studentIds.add(id);
        }
      }

      const studentDirectory = {};
      if (studentIds.size) {
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

      items = (records || []).map((r) => {
        const mapped = mapRegistrarGradeItem(
          {
            assignment_id: r.assignment_id,
            teacher_assignments: r.teacher_assignments,
            class_records: { ...r, term: normalizeGradeTerm(r.term) },
          },
          studentDirectory
        );
        return {
          ...mapped,
          term: normalizeGradeTerm(r.term),
          term_label: termLabel(r.term),
          item_key: `${r.assignment_id}-${normalizeGradeTerm(r.term)}`,
        };
      });
    }
  }

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
      title="Grade Validation"
      subtitle={
        dept
          ? `Pending class records for ${dept.name} — validate or return to the teacher.`
          : "Pending class records for your department / committee."
      }
    >
      <GradeValidationQueue items={items} />
    </AppShell>
  );
}
