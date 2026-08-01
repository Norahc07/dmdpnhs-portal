import { AuthShell } from "@/components/auth/AuthShell";
import { DataPrivacyNotice } from "@/components/auth/DataPrivacyNotice";
import { StudentLoginForm } from "@/components/auth/LoginForms";

export const metadata = { title: "Student Login" };

export default function StudentLoginPage() {
  return (
    <AuthShell>
      <DataPrivacyNotice audience="student" />
      <StudentLoginForm />
    </AuthShell>
  );
}
