import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { DocumentRequestForm } from "@/components/student/DocumentRequestForm";
import { requireRole } from "@/lib/auth-guard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Document Requests" };

export default async function StudentRequestsPage() {
  const { supabase, profile } = await requireRole("student");

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: requests } = await supabase
    .from("document_requests")
    .select("id, document_type, status, notes, requested_at")
    .eq("student_id", student?.id || "00000000-0000-0000-0000-000000000000")
    .order("requested_at", { ascending: false });

  return (
    <AppShell
      role="student"
      profile={profile}
      title="Document Requests"
      subtitle="Request SF9, SF10, or Good Moral. You will be notified when it is Ready for Pickup."
    >
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {student?.id ? (
          <DocumentRequestForm studentId={student.id} />
        ) : (
          <p className="rounded-2xl border border-dashed border-[#800000]/20 bg-white px-4 py-8 text-sm text-muted-foreground shadow-[0_12px_28px_-20px_rgba(61,18,18,0.25)]">
            Student record not linked yet. Contact the registrar.
          </p>
        )}

        <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <div className="portal-panel-head px-4 py-3">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
              History
            </p>
            <h3 className="font-heading text-sm font-bold text-[#3d1212]">
              Your document requests
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-[#800000]/10 hover:bg-transparent">
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(requests || []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-20 text-center text-muted-foreground"
                  >
                    No requests yet.
                  </TableCell>
                </TableRow>
              )}
              {(requests || []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.document_type}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.requested_at).toLocaleString("en-PH")}
                  </TableCell>
                  <TableCell className="text-sm">{r.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
