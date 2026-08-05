import { AppShell } from "@/components/layout/AppShell";
import { FacultyDirectory } from "@/components/registrar/FacultyDirectory";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "Faculty" };

export default async function RegistrarTeachersPage() {
  const { supabase, profile } = await requireRole("registrar");

  const pendingPromise = supabase
    .from("teachers")
    .select("*, profiles!inner(id, first_name, last_name, email, status, role)")
    .eq("profiles.status", "pending")
    .eq("profiles.role", "teacher");

  const teachersPromise = (async () => {
    let teachersRes = await supabase
      .from("teachers")
      .select(
        "id, teacher_id, faculty_dept, faculty_position, department_id, units, profiles(first_name, last_name, email, status), departments(id, name, band, grade_level)"
      )
      .order("teacher_id");

    if (teachersRes.error) {
      teachersRes = await supabase
        .from("teachers")
        .select(
          "id, teacher_id, faculty_dept, faculty_position, department_id, units, profiles(first_name, last_name, email, status), departments(id, name, band)"
        )
        .order("teacher_id");
    }
    return teachersRes;
  })();

  const departmentsPromise = (async () => {
    let departmentsRes = await supabase
      .from("departments")
      .select("id, name, band, grade_level, description")
      .order("band")
      .order("name");

    if (departmentsRes.error) {
      departmentsRes = await supabase
        .from("departments")
        .select("id, name, band, description")
        .order("band")
        .order("name");
    }
    return departmentsRes;
  })();

  const subjectsPromise = supabase
    .from("subjects")
    .select("id, subject_name, grade_level, track_strand, department_id")
    .order("grade_level")
    .order("subject_name");

  const sectionsPromise = supabase
    .from("sections")
    .select("id, section_name, grade_level, school_year, track_strand")
    .order("grade_level")
    .order("section_name");

  const assignmentsPromise = supabase
    .from("teacher_assignments")
    .select(
      "id, teacher_id, section_id, subject_id, school_year, sections(section_name, grade_level), subjects(subject_name)"
    );

  const [
    { data: pending },
    teachersRes,
    departmentsRes,
    { data: subjects },
    { data: sections },
    { data: assignments },
  ] = await Promise.all([
    pendingPromise,
    teachersPromise,
    departmentsPromise,
    subjectsPromise,
    sectionsPromise,
    assignmentsPromise,
  ]);

  const byTeacher = {};
  for (const a of assignments || []) {
    if (!byTeacher[a.teacher_id]) byTeacher[a.teacher_id] = [];
    const grade = a.sections?.grade_level;
    const section = a.sections?.section_name || "—";
    const year = a.school_year || "—";
    const subject = a.subjects?.subject_name;
    byTeacher[a.teacher_id].push({
      id: a.id,
      key: a.id || `${a.teacher_id}-${section}-${subject}-${year}`,
      label: `Grade ${grade} · ${section} (${year})`,
      subject: subject || null,
      gradeLevel: grade != null ? Number(grade) : null,
      sectionId: a.section_id,
      subjectId: a.subject_id,
      schoolYear: a.school_year,
    });
  }

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Faculty directory"
      subtitle="Add faculty, approve self-registrations, and assign departments, positions, and teaching loads."
    >
      <FacultyDirectory
        teachers={teachersRes.data || []}
        departments={departmentsRes.data || []}
        subjects={subjects || []}
        sections={sections || []}
        assignmentsByTeacher={byTeacher}
        pendingTeachers={pending || []}
      />
    </AppShell>
  );
}
