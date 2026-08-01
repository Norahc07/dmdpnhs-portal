import { AuthShell } from "@/components/auth/AuthShell";
import { DataPrivacyNotice } from "@/components/auth/DataPrivacyNotice";
import { TeacherLoginForm } from "@/components/auth/LoginForms";

export const metadata = { title: "Teacher Login" };

export default function TeacherLoginPage() {
  return (
    <AuthShell>
      <DataPrivacyNotice audience="teacher" />
      <TeacherLoginForm />
    </AuthShell>
  );
}
