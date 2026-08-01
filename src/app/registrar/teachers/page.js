import { AppShell } from "@/components/layout/AppShell";
import { FacultyDirectory } from "@/components/registrar/FacultyDirectory";
import { PendingTeachersTable } from "@/components/registrar/RegistrarPanels";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "Faculty" };

export default async function RegistrarTeachersPage() {
  const { supabase, profile } = await requireRole("registrar");

  const { data: pending } = await supabase
    .from("teachers")
    .select("*, profiles!inner(id, first_name, last_name, email, status, role)")
    .eq("profiles.status", "pending")
    .eq("profiles.role", "teacher");

  const { data: allTeachers } = await supabase
    .from("teachers")
    .select(
      "id, teacher_id, faculty_dept, faculty_position, department_id, units, profiles(first_name, last_name, email, status), departments(id, name, band)"
    )
    .order("teacher_id");

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, band, description")
    .order("band")
    .order("name");

  const { data: assignments } = await supabase
    .from("teacher_assignments")
    .select(
      "teacher_id, school_year, sections(section_name, grade_level), subjects(subject_name)"
    );

  const byTeacher = {};
  for (const a of assignments || []) {
    if (!byTeacher[a.teacher_id]) byTeacher[a.teacher_id] = [];
    byTeacher[a.teacher_id].push(
      `G${a.sections?.grade_level} ${a.sections?.section_name} · ${a.subjects?.subject_name} (${a.school_year})`
    );
  }

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Faculty directory"
      subtitle="Approve teachers, assign departments / positions, and set department heads for grade validation."
    >
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 font-heading text-lg font-bold text-[#3d1212]">
            Pending approvals
          </h2>
          <PendingTeachersTable teachers={pending || []} />
        </section>

        <section>
          <h2 className="mb-3 font-heading text-lg font-bold text-[#3d1212]">
            Departments & faculty assignments
          </h2>
          <FacultyDirectory
            teachers={allTeachers || []}
            departments={departments || []}
            assignmentsByTeacher={byTeacher}
          />
        </section>
      </div>
    </AppShell>
  );
}
