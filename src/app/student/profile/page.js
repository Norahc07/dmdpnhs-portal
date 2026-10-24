import { AppShell } from "@/components/layout/AppShell";
import { StudentProfileForm } from "@/components/profile/StudentProfileForm";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "Profile · Student" };

export default async function StudentProfilePage() {
  const { supabase, profile, studentAccess } = await requireRole("student");

  const { data: studentRow } = await supabase
    .from("students")
    .select(
      "id, lrn, grade_level, section_id, status, activation_status, contact_number, personal_email, address, emergency_contact_name, emergency_contact_number"
    )
    .eq("profile_id", profile.id)
    .maybeSingle();

  let section = null;
  if (studentRow?.section_id) {
    const { data } = await supabase
      .from("sections")
      .select("section_name, grade_level, school_year")
      .eq("id", studentRow.section_id)
      .maybeSingle();
    section = data;
  }
  const student = studentRow
    ? { ...studentRow, sections: section }
    : null;

  const activated = student?.activation_status === "active";
  const enrolled =
    student?.status === "enrolled" ||
    student?.status === "promoted" ||
    Boolean(student?.section_id);
  const access = studentAccess || { activated, enrolled };
  const accountStatus = !access.activated
    ? "Pending registrar verification"
    : access.enrolled
      ? "Officially enrolled"
      : "Activated — awaiting section enrollment";

  return (
    <AppShell
      role="student"
      profile={profile}
      title="Profile"
      subtitle="Student name, LRN, grade, section, school year, photo, account, and password."
      studentAccess={access}
    >
      <StudentProfileForm
        profile={profile}
        student={student}
        accountStatus={accountStatus}
      />
    </AppShell>
  );
}
