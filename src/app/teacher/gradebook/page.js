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
  let recordIds = new Set();
  if (assignmentIds.length) {
    const { data } = await supabase
      .from("class_records")
      .select("assignment_id")
      .in("assignment_id", assignmentIds);
    recordIds = new Set((data || []).map((record) => record.assignment_id));
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
    const existing = groupsBySection.get(assignment.section_id);
    if (existing) {
      existing.assignments.push({
        ...assignment,
        hasRecord: recordIds.has(assignment.id),
      });
      continue;
    }
    groupsBySection.set(assignment.section_id, {
      section: assignment.sections,
      isAdvisory: assignment.sections.adviser_id === teacher?.id,
      studentCount: students.filter(
        (student) => student.section_id === assignment.section_id
      ).length,
      assignments: [
        { ...assignment, hasRecord: recordIds.has(assignment.id) },
      ],
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
      subtitle="Open a handled section and subject to encode grades, review performance, and analyze assessments."
    >
      <ClassRecordCards groups={groups} />
    </AppShell>
  );
}
