import { AppShell } from "@/components/layout/AppShell";
import { TeacherProfileForm } from "@/components/profile/TeacherProfileForm";
import { requireRole } from "@/lib/auth-guard";
import { getTeacherAccess } from "@/lib/teacher-access";

export const metadata = { title: "Profile · Educator" };

export default async function TeacherProfilePage() {
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);

  const { data: teacher } = await supabase
    .from("teachers")
    .select("*")
    .eq("profile_id", profile.id)
    .maybeSingle();

  return (
    <AppShell
      role="teacher"
      profile={profile}
      title="Profile"
      subtitle="Update your photo and personal details used across the educator portal."
      teacherAccess={teacherAccess}
    >
      <TeacherProfileForm profile={profile} teacher={teacher} />
    </AppShell>
  );
}
