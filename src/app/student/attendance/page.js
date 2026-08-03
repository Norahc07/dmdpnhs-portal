import { AppShell } from "@/components/layout/AppShell";
import { StudentAttendanceView } from "@/components/student/StudentAttendanceView";
import { getStudentAttendance } from "@/actions/attendance";
import { requireRole } from "@/lib/auth-guard";
import {
  buildDemoAttendanceRecords,
  groupAttendanceByDate,
  summarizeAttendance,
  toDateKey,
} from "@/lib/attendance";

export const metadata = { title: "Attendance" };

export default async function StudentAttendancePage({ searchParams }) {
  const params = await searchParams;
  const { supabase, profile } = await requireRole([
    "student",
    "student-enrolled",
  ]);

  const now = new Date();
  const month = Number(params.month) || now.getMonth() + 1;
  const year = Number(params.year) || now.getFullYear();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  let days = [];
  let stats = summarizeAttendance([]);
  let records = [];
  let isDemo = false;

  if (student?.id) {
    const result = await getStudentAttendance(student.id, month, year);
    if (!result.error) {
      days = result.days || [];
      stats = result.stats || stats;
      records = result.records || [];
    } else {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
      const { data: rows } = await supabase
        .from("attendance")
        .select("id, date, status, notes")
        .eq("student_id", student.id)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false });

      records = (rows || []).map((r) => ({
        ...r,
        date: toDateKey(r.date),
        subjectName: "Daily / Homeroom",
        excuse: null,
      }));
      days = groupAttendanceByDate(records);
      stats = summarizeAttendance(records);
    }
  }

  // Demo sample when there is no live attendance for the month
  if (records.length === 0) {
    records = buildDemoAttendanceRecords(month, year);
    days = groupAttendanceByDate(records);
    stats = summarizeAttendance(records);
    isDemo = true;
  }

  return (
    <AppShell
      role="student"
      profile={profile}
      title="Attendance"
      subtitle="Monthly rate, calendar by subject period, and digital excuse letters for absences."
      studentAccess={{ activated: true, enrolled: true }}
    >
      <StudentAttendanceView
        initialMonth={month}
        initialYear={year}
        days={days}
        stats={stats}
        records={records}
        isDemo={isDemo}
      />
    </AppShell>
  );
}
