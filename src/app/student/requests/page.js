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
    .select("*")
    .eq("student_id", student?.id || "00000000-0000-0000-0000-000000000000")
    .order("requested_at", { ascending: false });

  return (
    <AppShell
      role="student"
      profile={profile}
      title="Document Requests"
      subtitle="Request Form 137, Certificate of Enrollment, or Good Moral."
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {student?.id ? (
          <DocumentRequestForm studentId={student.id} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Student record not linked yet. Contact the registrar.
          </p>
        )}

        <div className="overflow-hidden rounded-xl border border-[#800000]/10 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#800000]/5">
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Notes</TableHead>
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
