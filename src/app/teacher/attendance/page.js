import { AppShell } from "@/components/layout/AppShell";
import { AttendancePanel } from "@/components/teacher/AttendancePanel";
import { requireRole } from "@/lib/auth-guard";
import { getTeacherAccess } from "@/lib/teacher-access";
import { AttendanceSectionPicker } from "@/components/teacher/AttendanceSectionPicker";

export const metadata = { title: "Attendance" };

export default async function TeacherAttendancePage({ searchParams }) {
  const params = await searchParams;
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);

  const today = new Date().toISOString().slice(0, 10);
  const date = params.date || today;

  const { data: sections } = await supabase
    .from("sections")
    .select("*")
    .order("grade_level");

  const sectionId = params.sectionId || sections?.[0]?.id || "";

  const { data: students } = sectionId
    ? await supabase
        .from("students")
        .select("id, lrn, profiles(first_name, last_name)")
        .eq("section_id", sectionId)
        .order("lrn")
    : { data: [] };

  const { data: attendance } = sectionId
    ? await supabase
        .from("attendance")
        .select("*")
        .eq("section_id", sectionId)
        .eq("date", date)
    : { data: [] };

  const initialMap = Object.fromEntries(
    (attendance || []).map((a) => [a.student_id, a.status])
  );

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
      title="Smart Attendance"
      subtitle="Marking a learner Absent sends an SMS alert to linked parents."
    >
      <div className="mb-4">
        <AttendanceSectionPicker
          sections={sections || []}
          sectionId={sectionId}
          date={date}
        />
      </div>
      {sectionId ? (
        <AttendancePanel
          key={`${sectionId}-${date}`}
          students={students || []}
          sectionId={sectionId}
          date={date}
          initialMap={initialMap}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No sections available.</p>
      )}
    </AppShell>
  );
}
