import { AppShell } from "@/components/layout/AppShell";
import { PortalCalendarView } from "@/components/calendar/PortalCalendarView";
import { getPortalCalendarMonth } from "@/actions/calendar";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "School Calendar" };

export default async function StudentCalendarPage({ searchParams }) {
  const params = await searchParams;
  const { profile, supabase } = await requireRole("student");

  const { data: student } = await supabase
    .from("students")
    .select("id, grade_level, section_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month =
    Number(params.month) >= 0 ? Number(params.month) : now.getMonth();

  const calendar = await getPortalCalendarMonth({
    year,
    month,
    viewerGradeLevel: student?.grade_level ?? null,
    viewerSectionId: student?.section_id ?? null,
  });

  return (
    <AppShell
      role="student"
      profile={profile}
      title="School calendar"
      subtitle="Holidays, important dates, school events, and community birthdays — every year."
      studentAccess={{ activated: true, enrolled: true }}
    >
      {calendar.error ? (
        <p className="text-sm text-muted-foreground">{calendar.error}</p>
      ) : (
        <PortalCalendarView
          role="student"
          year={calendar.year}
          month={calendar.month}
          events={calendar.events || []}
          counts={calendar.counts || {}}
          backHref="/student"
        />
      )}
    </AppShell>
  );
}
