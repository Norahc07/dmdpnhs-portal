import { AppShell } from "@/components/layout/AppShell";
import { StudentAttendanceView } from "@/components/student/StudentAttendanceView";
import { getStudentAttendance } from "@/actions/attendance";
import { requireRole } from "@/lib/auth-guard";
import {
  groupAttendanceByDate,
  summarizeAttendance,
  toDateKey,
} from "@/lib/attendance";
import {
  humssAttendanceSubjectNames,
  isHumssAttendanceSubject,
  isHumssGrade12,
} from "@/lib/humss-academic-record";

export const metadata = { title: "Attendance" };

export default async function StudentAttendancePage({ searchParams }) {
  const params = await searchParams;
  const { supabase, profile, studentAccess } = await requireRole([
    "student",
    "student-enrolled",
  ]);

  const now = new Date();
  const month = Number(params.month) || now.getMonth() + 1;
  const year = Number(params.year) || now.getFullYear();

  const { data: studentRow } = await supabase
    .from("students")
    .select("id, grade_level, section_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  let section = null;
  if (studentRow?.section_id) {
    const { data } = await supabase
      .from("sections")
      .select("id, section_name, grade_level, track_strand")
      .eq("id", studentRow.section_id)
      .maybeSingle();
    section = data;
  }

  const student = studentRow
    ? { ...studentRow, sections: section }
    : null;
  const humssMode = isHumssGrade12(section || student, null);
  const expectedSubjects = humssMode ? humssAttendanceSubjectNames() : [];

  let days = [];
  let stats = summarizeAttendance([]);
  let records = [];

  if (student?.id) {
    const result = await getStudentAttendance(student.id, month, year);
    if (!result.error) {
      records = result.records || [];
    } else {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
      const { data: rows } = await supabase
        .from("attendance")
        .select("id, date, status, notes, subject_id")
        .eq("student_id", student.id)
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false });

      records = (rows || []).map((r) => ({
        ...r,
        date: toDateKey(r.date),
        subjectName: r.subject_id ? "Subject" : "Daily / Homeroom",
        excuse: null,
      }));
    }

    if (humssMode) {
      records = records.filter((row) =>
        isHumssAttendanceSubject({ subject_name: row.subjectName })
      );
    }

    days = groupAttendanceByDate(records);
    stats = summarizeAttendance(records);
  }

  return (
    <AppShell
      role="student"
      profile={profile}
      title="Attendance"
      subtitle={
        humssMode
          ? "Your Term 2 attendance only — Present, Late, Absent, or Excused, with day history."
          : "Monthly rate, calendar by subject period, and attendance history."
      }
      studentAccess={studentAccess}
    >
      <StudentAttendanceView
        initialMonth={month}
        initialYear={year}
        days={days}
        stats={stats}
        records={records}
        expectedSubjects={expectedSubjects}
        historyHint={
          humssMode
            ? "Term 2 subjects for the selected day. Earlier days stay in history."
            : undefined
        }
      />
    </AppShell>
  );
}
