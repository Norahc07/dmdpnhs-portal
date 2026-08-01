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

export const metadata = { title: "Attendance" };

export default async function StudentAttendancePage() {
  const { supabase, profile } = await requireRole(["student", "student-enrolled"]);

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: rows } = await supabase
    .from("attendance")
    .select("*")
    .eq("student_id", student?.id || "00000000-0000-0000-0000-000000000000")
    .order("date", { ascending: false })
    .limit(60);

  return (
    <AppShell
      role="student"
      profile={profile}
      title="Attendance"
      subtitle="Your recent daily attendance records."
      studentAccess={{ activated: true, enrolled: true }}
    >
      <div className="overflow-hidden rounded-xl border border-[#800000]/10 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#800000]/5">
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="h-20 text-center text-muted-foreground">
                  No attendance records yet.
                </TableCell>
              </TableRow>
            )}
            {(rows || []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {new Date(r.date).toLocaleDateString("en-PH", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
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
