import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { requireRole } from "@/lib/auth-guard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Child Attendance" };

export default async function ParentAttendancePage() {
  const { supabase, profile } = await requireRole("parent");

  const { data: parent } = await supabase
    .from("parents")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: links } = await supabase
    .from("parent_student_links")
    .select("student_id")
    .eq("parent_id", parent?.id || "00000000-0000-0000-0000-000000000000");

  const studentIds = (links || []).map((l) => l.student_id);

  const { data: rows } = studentIds.length
    ? await supabase
        .from("attendance")
        .select("*, students(lrn, profiles(first_name, last_name))")
        .in("student_id", studentIds)
        .order("date", { ascending: false })
        .limit(100)
    : { data: [] };

  return (
    <AppShell
      role="parent"
      profile={profile}
      title="Attendance"
      subtitle="Daily attendance for linked learners. Absences trigger SMS alerts."
    >
      <div className="overflow-hidden rounded-xl border border-[#800000]/10 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#800000]/5">
              <TableHead>Learner</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                  No attendance records.
                </TableCell>
              </TableRow>
            )}
            {(rows || []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {r.students?.profiles?.last_name},{" "}
                  {r.students?.profiles?.first_name}
                </TableCell>
                <TableCell>
                  {new Date(r.date).toLocaleDateString("en-PH")}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
