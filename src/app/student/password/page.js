import { AppShell } from "@/components/layout/AppShell";
import { ChangePasswordForm } from "@/components/student/ChangePasswordForm";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "Change Password" };

export default async function StudentPasswordPage() {
  const { profile, studentAccess } = await requireRole("student");

  return (
    <AppShell
      role="student"
      profile={profile}
      title="Change Password"
      subtitle="Use your current password, then set a new one for LRN sign-in."
      studentAccess={studentAccess}
    >
      <ChangePasswordForm audience="student" />
    </AppShell>
  );
}
