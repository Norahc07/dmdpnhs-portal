import { AppShell } from "@/components/layout/AppShell";
import { EnrollmentTable } from "@/components/registrar/EnrollmentTable";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "Enrollment" };

export default async function RegistrarEnrollmentPage() {
  const { supabase, profile } = await requireRole("registrar");

  const [{ data: students }, { data: sections }] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id, lrn, gender, grade_level, section_id, status, activation_status, profiles(first_name, last_name)"
      )
      .in("activation_status", ["active", "pending"])
      .order("grade_level")
      .limit(800),
    supabase
      .from("sections")
      .select(
        "id, section_name, grade_level, school_year, track_strand, capacity, male_count, female_count"
      )
      .order("grade_level"),
  ]);

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="School year enrollment"
      subtitle="Filter by school year, grade level, section, and gender. Totals per grade included."
    >
      <EnrollmentTable
        students={students || []}
        sections={sections || []}
      />
    </AppShell>
  );
}
