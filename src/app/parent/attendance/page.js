import { AppShell } from "@/components/layout/AppShell";
import { ParentChildPicker } from "@/components/parent/ParentChildPicker";
import { StudentAttendanceView } from "@/components/student/StudentAttendanceView";
import { getStudentAttendance } from "@/actions/attendance";
import { requireRole } from "@/lib/auth-guard";
import {
  buildDemoAttendanceRecords,
  groupAttendanceByDate,
  summarizeAttendance,
} from "@/lib/attendance";

export const metadata = { title: "Child Attendance" };

export default async function ParentAttendancePage({ searchParams }) {
  const params = await searchParams;
  const { supabase, profile } = await requireRole("parent");

  const now = new Date();
  const month = Number(params.month) || now.getMonth() + 1;
  const year = Number(params.year) || now.getFullYear();

  const { data: parent } = await supabase
    .from("parents")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: links } = await supabase
    .from("parent_student_links")
    .select(
      "student_id, students(id, lrn, grade_level, profiles(first_name, last_name), sections(section_name, grade_level))"
    )
    .eq("parent_id", parent?.id || "00000000-0000-0000-0000-000000000000");

  const children = (links || []).map((l) => l.students).filter(Boolean);
  const requestedId = params.studentId;
  const selected =
    children.find((c) => c.id === requestedId) || children[0] || null;

  let days = [];
  let stats = summarizeAttendance([]);
  let records = [];
  let isDemo = false;

  if (selected?.id) {
    const result = await getStudentAttendance(selected.id, month, year);
    if (!result.error) {
      days = result.days || [];
      stats = result.stats || stats;
      records = result.records || [];
    }

    if (records.length === 0) {
      records = buildDemoAttendanceRecords(month, year);
      days = groupAttendanceByDate(records);
      stats = summarizeAttendance(records);
      isDemo = true;
    }
  }

  const childName = selected
    ? `${selected.profiles?.last_name || "—"}, ${selected.profiles?.first_name || "—"}`
    : null;

  return (
    <AppShell
      role="parent"
      profile={profile}
      title="Attendance"
      subtitle={
        childName
          ? `Same attendance view as the student portal for ${childName}.`
          : "Monthly rate, calendar by subject period, and day history for linked learners."
      }
    >
      <div className="space-y-4">
        {children.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#800000]/20 bg-white px-5 py-10 text-center text-sm text-muted-foreground shadow-[0_12px_28px_-20px_rgba(61,18,18,0.25)]">
            No learners linked to this parent account yet.
          </div>
        ) : (
          <>
            <ParentChildPicker
              childrenList={children}
              selectedId={selected?.id}
            />
            <StudentAttendanceView
              key={`${selected?.id}-${month}-${year}`}
              initialMonth={month}
              initialYear={year}
              days={days}
              stats={stats}
              records={records}
              isDemo={isDemo}
              allowExcuse={false}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}
