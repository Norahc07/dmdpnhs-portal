import { AuthShell } from "@/components/auth/AuthShell";
import { TeacherRegisterForm } from "@/components/auth/TeacherRegisterForm";

export const metadata = { title: "Faculty Registration" };

export default function TeacherRegisterPage() {
  return (
    <AuthShell wide>
      <TeacherRegisterForm />
    </AuthShell>
  );
}
