import { AppShell } from "@/components/layout/AppShell";
import { DocumentManagementBoard } from "@/components/documents/DocumentManagementBoard";
import { DocumentRequestsAdmin } from "@/components/registrar/RegistrarPanels";
import { listManagedRequiredDocuments } from "@/actions/student-documents";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "Documents" };

export default async function RegistrarRequestsPage() {
  const { supabase, profile } = await requireRole("registrar");

  const { data: requests } = await supabase
    .from("document_requests")
    .select(
      "*, students(id, lrn, profiles(first_name, last_name))"
    )
    .order("requested_at", { ascending: false });

  const required = await listManagedRequiredDocuments();

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Documents"
      subtitle="Review required uploads, then process official copy pickup."
    >
      <div className="space-y-6">
        {required.error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {required.error}
          </p>
        ) : (
          <DocumentManagementBoard
            learners={required.learners || []}
            counts={required.counts || {}}
            hint={required.hint || ""}
          />
        )}
        <DocumentRequestsAdmin requests={requests || []} />
      </div>
    </AppShell>
  );
}
