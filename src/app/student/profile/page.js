import { AppShell } from "@/components/layout/AppShell";
import { StudentProfileForm } from "@/components/profile/StudentProfileForm";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "My Profile · Student" };

export default async function StudentProfilePage() {
  const { supabase, profile } = await requireRole("student");

  const { data: student } = await supabase
    .from("students")
    .select("*, sections(section_name, grade_level, school_year)")
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
      studentAccess={{ activated, enrolled }}
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-[#3d1212]">
            My profile
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your photo and personal details used across the student portal.
          </p>
        </div>
        <StudentProfileForm profile={profile} student={student} />
      </div>
    </AppShell>
  );
}
