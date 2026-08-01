import { AppShell } from "@/components/layout/AppShell";
import { DocumentRequestsAdmin } from "@/components/registrar/RegistrarPanels";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "Document Requests" };

export default async function RegistrarRequestsPage() {
  const { supabase, profile } = await requireRole("registrar");

  const { data: requests } = await supabase
    .from("document_requests")
    .select(
      "*, students(id, lrn, profiles(first_name, last_name))"
    )
    .order("requested_at", { ascending: false });

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Document Request Pipeline"
      subtitle="Advance requests: Pending → Processing → Ready for Pickup."
    >
      <DocumentRequestsAdmin requests={requests || []} />
    </AppShell>
  );
}
