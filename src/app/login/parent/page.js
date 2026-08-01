import { AuthShell } from "@/components/auth/AuthShell";
import { ParentLoginForm } from "@/components/auth/LoginForms";

export const metadata = { title: "Parent Login" };

export default function ParentLoginPage() {
  return (
    <AuthShell>
      <ParentLoginForm />
    </AuthShell>
  );
}
