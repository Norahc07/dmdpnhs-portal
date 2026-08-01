import { AppShell } from "@/components/layout/AppShell";
import { AcademicsManager } from "@/components/registrar/AcademicsManager";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "Academics" };

export default async function RegistrarAcademicsPage() {
  const { supabase, profile } = await requireRole("registrar");

  const [
    { data: subjects },
    { data: sections },
    { data: teachers },
    { data: assignments },
    { data: students },
  ] = await Promise.all([
    supabase.from("subjects").select("*").order("grade_level"),
    supabase.from("sections").select("*").order("grade_level"),
    supabase
      .from("teachers")
      .select(
        "id, teacher_id, faculty_dept, profiles(first_name, last_name, status)"
      )
      .order("teacher_id"),
    supabase
      .from("teacher_assignments")
      .select(
        "*, teachers(id, teacher_id, profiles(first_name, last_name)), sections(section_name, grade_level), subjects(subject_name, grade_level)"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("students")
      .select(
        "id, lrn, gender, grade_level, section_id, status, activation_status, profiles(first_name, last_name), sections(section_name, grade_level)"
      )
      .order("lrn"),
  ]);

  const activeTeachers = (teachers || []).filter(
    (t) => t.profiles?.status === "active"
  );

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Academics & enrollment setup"
      subtitle="Manage subjects, sections, student enrollment, and teacher assignments."
    >
      <AcademicsManager
        subjects={subjects || []}
        sections={sections || []}
        teachers={activeTeachers}
        assignments={assignments || []}
        students={students || []}
      />
    </AppShell>
  );
}
