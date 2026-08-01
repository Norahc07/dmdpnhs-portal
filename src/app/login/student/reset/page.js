import { AuthShell } from "@/components/auth/AuthShell";
import { StudentResetPasswordForm } from "@/components/auth/StudentRegisterForms";

export const metadata = { title: "Reset Student Password" };

export default function StudentResetPasswordPage() {
  return (
    <AuthShell>
      <StudentResetPasswordForm />
    </AuthShell>
  );
}
