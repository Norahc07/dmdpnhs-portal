import { AppShell } from "@/components/layout/AppShell";
import { AcademicsManager } from "@/components/registrar/AcademicsManager";
import { requireRole } from "@/lib/auth-guard";
import {
  getCachedRegistrarSections,
  getCachedRegistrarStudents,
} from "@/lib/cache/registrar-data";

export const metadata = { title: "Academics" };

export default async function RegistrarAcademicsPage() {
  const { supabase, profile } = await requireRole("registrar");

  const [
    { data: subjects },
    sectionsCached,
    { data: teachers },
    { data: assignments },
    studentsCached,
  ] = await Promise.all([
    supabase
      .from("subjects")
      .select(
        "id, subject_name, grade_level, track_strand, department_id, written_weight, performance_weight, assessment_weight"
      )
      .order("grade_level"),
    getCachedRegistrarSections(),
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
    getCachedRegistrarStudents(),
  ]);

  const sections = sectionsCached.rows || [];
  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const students = (studentsCached.rows || [])
    .filter((s) => {
      const a = String(s.activation_status || "").toLowerCase();
      return a === "active" || a === "pending";
    })
    .slice(0, 500)
    .map((s) => ({
      ...s,
      sections: s.section_id ? sectionById.get(s.section_id) || null : null,
    }));

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
        sections={sections}
        teachers={activeTeachers}
        assignments={assignments || []}
        students={students}
      />
    </AppShell>
  );
}
