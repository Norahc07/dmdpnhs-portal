import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth-guard";
import {
  formatTimeLabel,
  loadStudentClassSchedule,
  WEEKDAY_LABELS,
} from "@/lib/student-dashboard";

export const metadata = { title: "Class Schedule" };

export default async function StudentSchedulePage() {
  const { supabase, profile, studentAccess } = await requireRole([
    "student",
    "student-enrolled",
  ]);

  const { data: studentRow } = await supabase
    .from("students")
    .select("id, grade_level, section_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  let section = null;
  if (studentRow?.section_id) {
    const { data } = await supabase
      .from("sections")
      .select("section_name, grade_level, school_year")
      .eq("id", studentRow.section_id)
      .maybeSingle();
    section = data;
  }
  const student = studentRow ? { ...studentRow, sections: section } : null;
  const { periods } = await loadStudentClassSchedule(supabase, student);

  const hasWeekend = periods.some(
    (row) => row.day_of_week === 0 || row.day_of_week === 6
  );
  const days = hasWeekend ? [1, 2, 3, 4, 5, 6, 0] : [1, 2, 3, 4, 5];

  return (
    <AppShell
      role="student"
      profile={profile}
      title="Class Schedule"
      subtitle="Weekly timetable for your assigned section and subjects."
      studentAccess={studentAccess}
    >
      <section className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="portal-panel-head px-5 py-4">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
            Weekly timetable
          </p>
          <h3 className="mt-1 font-heading text-lg font-bold text-[#3d1212]">
            {section
              ? `Grade ${section.grade_level} · ${section.section_name}`
              : "Section not assigned"}
          </h3>
          {section?.school_year ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              SY {section.school_year}
            </p>
          ) : null}
        </div>

        {periods.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No class periods are posted yet. Subject list may still appear on
            the dashboard while the timetable is being assigned.
          </p>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
            {days.map((day) => {
              const rows = periods.filter((row) => row.day_of_week === day);
              return (
                <div
                  key={day}
                  className="rounded-xl border border-[#800000]/10 bg-[#faf7f5]/70 p-3"
                >
                  <p className="text-xs font-semibold tracking-wide text-[#800000] uppercase">
                    {WEEKDAY_LABELS[day]}
                  </p>
                  <div className="mt-2 space-y-2">
                    {rows.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No classes</p>
                    ) : (
                      rows.map((row) => (
                        <article
                          key={row.id}
                          className="rounded-lg border border-[#800000]/08 bg-white px-3 py-2"
                        >
                          <p className="text-sm font-semibold text-[#3d1212]">
                            {row.subject_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeLabel(row.start_time)}–{formatTimeLabel(row.end_time)}
                            {row.room ? ` · ${row.room}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-[#3d1212]">
                            {row.teacher_name || "Teacher TBA"}
                          </p>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
