import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ClassRecordWorkspace } from "@/components/teacher/ClassRecordWorkspace";
import { requireRole } from "@/lib/auth-guard";
import { SCHOOL_NAME } from "@/lib/constants";
import { GRADE_WORKFLOW } from "@/lib/grade-workflow";
import { normalizeGradeTerm, termLabel } from "@/lib/grades-terms";
import { getTeacherAccess } from "@/lib/teacher-access";

export const metadata = { title: "Class Record" };

export default async function ClassRecordPage({ params, searchParams }) {
  const { assignmentId } = await params;
  const query = await searchParams;
  const term = normalizeGradeTerm(query?.term);
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, profiles(first_name, last_name)")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: assignment } = await supabase
    .from("teacher_assignments")
    .select("id, school_year, sections(*), subjects(*)")
    .eq("id", assignmentId)
    .eq(
      "teacher_id",
      teacher?.id || "00000000-0000-0000-0000-000000000000"
    )
    .maybeSingle();

  if (!assignment?.sections || !assignment?.subjects) notFound();

  const { data: students } = await supabase
    .from("students")
    .select("id, lrn, gender, profiles(first_name, last_name)")
    .eq("section_id", assignment.sections.id)
    .order("gender")
    .order("lrn");

  let classRecord = null;
  const withTerm = await supabase
    .from("class_records")
    .select("data, updated_at, workflow_status, review_notes, term")
    .eq("assignment_id", assignment.id)
    .eq("term", term)
    .maybeSingle();

  if (!withTerm.error) {
    classRecord = withTerm.data;
  } else if (String(withTerm.error.message || "").toLowerCase().includes("term")) {
    if (term !== 1) {
      // Term column missing — only term 1 workbook exists
      classRecord = null;
    } else {
      const legacy = await supabase
        .from("class_records")
        .select("data, updated_at, workflow_status, review_notes")
        .eq("assignment_id", assignment.id)
        .maybeSingle();
      classRecord = legacy.data;
    }
  }

  const teacherName = [
    teacher?.profiles?.first_name,
    teacher?.profiles?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const termName = termLabel(term);
  const defaults = {
    region: "",
    division: "",
    schoolName: SCHOOL_NAME,
    schoolId: "",
    schoolYear: assignment.school_year || assignment.sections.school_year || "",
    gradeSection: `Grade ${assignment.sections.grade_level} - ${assignment.sections.section_name}`,
    teacher: teacherName,
    term: termName,
    subject: assignment.subjects.subject_name,
    track:
      assignment.subjects.track_strand || "Core Subject (All Tracks)",
  };

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
      title="Class Record"
      subtitle={`${assignment.subjects.subject_name} · ${termName} · Grade ${assignment.sections.grade_level} ${assignment.sections.section_name}`}
    >
      <ClassRecordWorkspace
        assignmentId={assignment.id}
        term={term}
        subjectId={assignment.subjects.id}
        initialWeights={assignment.subjects}
        metadataDefaults={defaults}
        initialData={classRecord?.data || null}
        initialWorkflowStatus={
          classRecord?.workflow_status || GRADE_WORKFLOW.DRAFT
        }
        reviewNotes={classRecord?.review_notes || null}
        students={(students || []).map((student) => ({
          id: student.id,
          lrn: student.lrn,
          gender: student.gender || "Unspecified",
          firstName: student.profiles?.first_name || "",
          lastName: student.profiles?.last_name || "",
        }))}
        isAdvisory={assignment.sections.adviser_id === teacher?.id}
      />
    </AppShell>
  );
}
