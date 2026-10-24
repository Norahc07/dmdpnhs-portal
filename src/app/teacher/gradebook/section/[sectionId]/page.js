import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AcademicRecordSectionBoard } from "@/components/teacher/AcademicRecordSectionBoard";
import { requireRole } from "@/lib/auth-guard";
import { isHumssGrade12 } from "@/lib/humss-academic-record";
import { getTeacherAccess } from "@/lib/teacher-access";

export const metadata = { title: "Academic Record" };

export default async function AcademicRecordSectionPage({ params }) {
  const { sectionId } = await params;
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: section } = await supabase
    .from("sections")
    .select("id, section_name, grade_level, school_year, track_strand, adviser_id")
    .eq("id", sectionId)
    .maybeSingle();

  if (!section || !isHumssGrade12(section)) notFound();

  const isAdviser = section.adviser_id === teacher?.id;
  const assignmentQuery = supabase
    .from("teacher_assignments")
    .select("id, section_id, subject_id, teacher_id, school_year, subjects(*)")
    .eq("section_id", section.id);
  const { data: assignments } = isAdviser
    ? await assignmentQuery
    : await assignmentQuery.eq(
        "teacher_id",
        teacher?.id || "00000000-0000-0000-0000-000000000000"
      );

  const assignmentIds = (assignments || []).map((item) => item.id);
  const recordsByAssignment = {};
  if (assignmentIds.length) {
    const { data, error } = await supabase
      .from("class_records")
      .select("assignment_id, term, workflow_status")
      .in("assignment_id", assignmentIds);
    if (!error) {
      for (const record of data || []) {
        const term = Number(record.term) || 1;
        const existing = recordsByAssignment[record.assignment_id] || {};
        existing[term] = record.workflow_status || "draft";
        recordsByAssignment[record.assignment_id] = existing;
      }
    }
  }

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
      title="Academic Record"
      subtitle={`Grade ${section.grade_level} ${section.section_name} · Term 1, Term 2, and Term 3 stay visible`}
    >
      <AcademicRecordSectionBoard
        section={section}
        assignments={assignments || []}
        recordsByAssignment={recordsByAssignment}
        teacherId={teacher?.id}
      />
    </AppShell>
  );
}
