import { AuthShell } from "@/components/auth/AuthShell";
import { StudentRegisterForm } from "@/components/auth/StudentRegisterForms";

export const metadata = { title: "Student Registration" };

export default function StudentRegisterPage() {
  return (
    <AuthShell wide>
      <StudentRegisterForm />
    </AuthShell>
  );
}
