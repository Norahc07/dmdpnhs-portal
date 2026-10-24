import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { DocumentManagementBoard } from "@/components/documents/DocumentManagementBoard";
import { listManagedRequiredDocuments } from "@/actions/student-documents";
import { requireRole } from "@/lib/auth-guard";
import { loadTeacherHandledSections, sectionLabel } from "@/lib/announcements";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeacherAccess } from "@/lib/teacher-access";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Documents" };

export default async function TeacherDocumentsPage() {
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);
  const admin = createAdminClient();
  const sections = teacherAccess.teacherId
    ? await loadTeacherHandledSections(admin, teacherAccess.teacherId)
    : [];
  const sectionIds = sections.map((section) => section.id);

  let requests = [];
  if (sectionIds.length) {
    const { data: students } = await admin
      .from("students")
      .select("id, lrn, section_id, profiles(first_name, last_name)")
      .in("section_id", sectionIds);
    const studentMap = new Map((students || []).map((row) => [row.id, row]));
    const sectionMap = new Map(sections.map((section) => [section.id, section]));
    const studentIds = (students || []).map((row) => row.id);

    if (studentIds.length) {
      const { data } = await admin
        .from("document_requests")
        .select("id, document_type, status, notes, requested_at, student_id")
        .in("student_id", studentIds)
        .order("requested_at", { ascending: false });
      requests = (data || []).map((row) => {
        const student = studentMap.get(row.student_id);
        const section = sectionMap.get(student?.section_id);
        const name = student?.profiles
          ? `${student.profiles.last_name}, ${student.profiles.first_name}`
          : "Learner";
        return {
          ...row,
          learnerName: name,
          lrn: student?.lrn || "—",
          sectionLabel: section ? sectionLabel(section) : "Section",
        };
      });
    }
  }

  const required = await listManagedRequiredDocuments();

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
      title="Documents"
      subtitle="Review required uploads from your sections. The registrar processes official copies."
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

        <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <div className="portal-panel-head px-5 py-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
              Official copies
            </p>
            <h3 className="mt-1 font-heading text-lg font-bold text-[#3d1212]">
              SF9, SF10, and Good Moral requests
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-[#800000]/10 hover:bg-transparent">
                <TableHead>Learner</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-20 text-center text-muted-foreground"
                  >
                    No official copy requests from your sections yet.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium text-[#3d1212]">{row.learnerName}</p>
                      <p className="text-xs text-muted-foreground">LRN {row.lrn}</p>
                    </TableCell>
                    <TableCell className="text-sm">{row.sectionLabel}</TableCell>
                    <TableCell className="font-medium">{row.document_type}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.requested_at
                        ? new Date(row.requested_at).toLocaleString("en-PH")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
