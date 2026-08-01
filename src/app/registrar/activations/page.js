import { AppShell } from "@/components/layout/AppShell";
import { PendingActivationsTable } from "@/components/registrar/PendingActivationsTable";
import { requireRole } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Student Activations" };

export default async function RegistrarActivationsPage() {
  const { profile } = await requireRole("registrar");
  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("students")
    .select(
      "*, profiles(first_name, last_name, email, status), sections(section_name, grade_level, school_year)"
    )
    .eq("activation_status", "pending")
    .order("lrn");

  // Attach parent info (1 parent)
  const rows = [];
  for (const stu of pending || []) {
    const { data: links } = await admin
      .from("parent_student_links")
      .select("parents(phone_number, access_code, profiles(first_name, last_name))")
      .eq("student_id", stu.id)
      .limit(1);

    const parent = links?.[0]?.parents;
    rows.push({
      ...stu,
      parent_name: parent
        ? `${parent.profiles?.first_name || ""} ${parent.profiles?.last_name || ""}`.trim()
        : "",
      parent_phone: parent?.phone_number || "",
      parent_access_code_shown:
        stu.parent_access_code_shown || parent?.access_code || "",
    });
  }

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Student activations"
      subtitle="Call the parent/guardian number to confirm it is real, verify personal details, then Verify & Approve. DMDPNHS SMSs the Parent Access Code and notifies the student."
    >
      <PendingActivationsTable rows={rows} />
    </AppShell>
  );
}
