import { AppShell } from "@/components/layout/AppShell";
import { StudentTrashTable } from "@/components/registrar/StudentTrashTable";
import { listTrashedStudents } from "@/actions/activation";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "Student Trash" };

export default async function RegistrarTrashPage() {
  const { profile } = await requireRole("registrar");
  const result = await listTrashedStudents();

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Student Trash"
      subtitle="Temporarily hold deleted learners. Restore them to the system, or permanently remove records. Trashed LRNs are free for new enrollment."
    >
      <StudentTrashTable
        students={result.students || []}
        hint={result.hint || result.error || ""}
      />
    </AppShell>
  );
}
