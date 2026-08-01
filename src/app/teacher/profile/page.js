import { AppShell } from "@/components/layout/AppShell";
import { TeacherProfileForm } from "@/components/profile/TeacherProfileForm";
import { requireRole } from "@/lib/auth-guard";
import { getTeacherAccess } from "@/lib/teacher-access";

export const metadata = { title: "My Profile · Teacher" };

export default async function TeacherProfilePage() {
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);

  const { data: teacher } = await supabase
    .from("teachers")
    .select("*")
    .eq("profile_id", profile.id)
    .maybeSingle();

  return (
    <AppShell role="teacher" profile={profile} teacherAccess={teacherAccess}>
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-[#3d1212]">
            My profile
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your photo and personal details used across the teacher portal.
          </p>
        </div>
        <TeacherProfileForm profile={profile} teacher={teacher} />
      </div>
    </AppShell>
  );
}
