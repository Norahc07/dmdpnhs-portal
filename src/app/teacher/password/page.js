import { AppShell } from "@/components/layout/AppShell";
import { ChangePasswordForm } from "@/components/student/ChangePasswordForm";
import { requireRole } from "@/lib/auth-guard";
import { getTeacherAccess } from "@/lib/teacher-access";

export const metadata = { title: "Change Password" };

export default async function TeacherPasswordPage() {
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
      title="Change Password"
      subtitle="Use your current password, then set a new one for email or Teacher ID sign-in."
    >
      <ChangePasswordForm />
    </AppShell>
  );
}
