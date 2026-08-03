import { AppShell } from "@/components/layout/AppShell";
import { ClassRecordCards } from "@/components/teacher/ClassRecordCards";
import { requireRole } from "@/lib/auth-guard";
import { getTeacherAccess } from "@/lib/teacher-access";

export const metadata = { title: "Class Records" };

export default async function TeacherGradebookPage() {
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: assignments } = await supabase
    .from("teacher_assignments")
    .select(
      "id, section_id, subject_id, school_year, sections(*), subjects(*)"
    )
    .eq(
      "teacher_id",
      teacher?.id || "00000000-0000-0000-0000-000000000000"
    )
    .order("school_year", { ascending: false });

  const sectionIds = [
    ...new Set((assignments || []).map((item) => item.section_id)),
  ];
  const assignmentIds = (assignments || []).map((item) => item.id);

  /** @type {Map<string, Record<number, string>>} */
  const recordsByAssignment = new Map();
  if (assignmentIds.length) {
    const { data, error } = await supabase
      .from("class_records")
      .select("assignment_id, term, workflow_status")
      .in("assignment_id", assignmentIds);

    if (!error) {
      for (const record of data || []) {
        const term = Number(record.term) || 1;
        const existing = recordsByAssignment.get(record.assignment_id) || {};
        existing[term] = record.workflow_status || "draft";
        recordsByAssignment.set(record.assignment_id, existing);
      }
    } else if (String(error.message || "").toLowerCase().includes("term")) {
      // Legacy DB without term column — treat existing row as term 1
      const { data: legacy } = await supabase
        .from("class_records")
        .select("assignment_id, workflow_status")
        .in("assignment_id", assignmentIds);
      for (const record of legacy || []) {
        recordsByAssignment.set(record.assignment_id, {
          1: record.workflow_status || "draft",
        });
      }
    }
  }

  let students = [];
  if (sectionIds.length) {
    const { data } = await supabase
      .from("students")
      .select("id, section_id")
      .in("section_id", sectionIds)
      .eq("activation_status", "active");
    students = data || [];
  }

  const groupsBySection = new Map();
  for (const assignment of assignments || []) {
    if (!assignment.sections) continue;
    const enriched = {
      ...assignment,
      recordsByTerm: recordsByAssignment.get(assignment.id) || {},
    };
    const existing = groupsBySection.get(assignment.section_id);
    if (existing) {
      existing.assignments.push(enriched);
      continue;
    }
    groupsBySection.set(assignment.section_id, {
      section: assignment.sections,
      isAdvisory: assignment.sections.adviser_id === teacher?.id,
      studentCount: students.filter(
        (student) => student.section_id === assignment.section_id
      ).length,
      assignments: [enriched],
    });
  }

  const groups = Array.from(groupsBySection.values()).sort(
    (a, b) =>
      Number(a.section.grade_level) - Number(b.section.grade_level) ||
      a.section.section_name.localeCompare(b.section.section_name)
  );

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
      title="Class Records"
      subtitle="Create a class record for 1st, 2nd, and Final Term each school year. Submit for department head / committee validation."
    >
      <ClassRecordCards groups={groups} />
    </AppShell>
  );
}
