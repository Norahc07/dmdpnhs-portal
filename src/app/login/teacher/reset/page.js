import { AuthShell } from "@/components/auth/AuthShell";
import { EducatorResetPasswordForm } from "@/components/auth/EducatorResetPasswordForm";

export const metadata = { title: "Reset Educator Password" };

export default function EducatorResetPasswordPage() {
  return (
    <AuthShell>
      <EducatorResetPasswordForm />
    </AuthShell>
  );
}
