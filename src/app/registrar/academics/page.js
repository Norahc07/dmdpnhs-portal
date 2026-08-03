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
    supabase
      .from("subjects")
      .select(
        "id, subject_name, grade_level, track_strand, department_id, written_weight, performance_weight, assessment_weight"
      )
      .order("grade_level"),
    supabase
      .from("sections")
      .select(
        "id, section_name, grade_level, school_year, track_strand, capacity, male_count, female_count, location"
      )
      .order("grade_level"),
    supabase
      .from("teachers")
      .select(
        "id, teacher_id, faculty_dept, profiles(first_name, last_name, status)"
      )
      .order("teacher_id"),
    supabase
      .from("teacher_assignments")
      .select(
        "id, teacher_id, section_id, subject_id, school_year, teachers(id, teacher_id, profiles(first_name, last_name)), sections(section_name, grade_level), subjects(subject_name, grade_level)"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("students")
      .select(
        "id, lrn, gender, grade_level, section_id, status, activation_status, profiles(first_name, last_name), sections(section_name, grade_level)"
      )
      .in("activation_status", ["active", "pending"])
      .order("lrn")
      .limit(500),
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
