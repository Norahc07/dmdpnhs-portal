import { AppShell } from "@/components/layout/AppShell";
import { StudentProfileForm } from "@/components/profile/StudentProfileForm";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "My Profile · Student" };

export default async function StudentProfilePage() {
  const { supabase, profile } = await requireRole("student");

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, lrn, grade_level, section_id, status, activation_status, contact_number, personal_email, address, emergency_contact_name, emergency_contact_number, sections(section_name, grade_level, school_year)"
    )
    .eq("profile_id", profile.id)
    .maybeSingle();

  const activated = student?.activation_status === "active";
  const enrolled =
    student?.status === "enrolled" ||
    student?.status === "promoted" ||
    Boolean(student?.section_id);

  return (
    <AppShell
      role="student"
      profile={profile}
      title="My profile"
      subtitle="Update your photo and personal details used across the student portal."
      studentAccess={{ activated, enrolled }}
    >
      <StudentProfileForm profile={profile} student={student} />
    </AppShell>
  );
}
