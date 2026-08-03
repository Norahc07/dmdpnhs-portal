import { AppShell } from "@/components/layout/AppShell";
import { PortalCalendarView } from "@/components/calendar/PortalCalendarView";
import { getPortalCalendarMonth } from "@/actions/calendar";
import { requireRole } from "@/lib/auth-guard";
import { getTeacherAccess } from "@/lib/teacher-access";

export const metadata = { title: "School Calendar" };

export default async function TeacherCalendarPage({ searchParams }) {
  const params = await searchParams;
  const { profile, supabase } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);

  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month =
    Number(params.month) >= 0 ? Number(params.month) : now.getMonth();

  const calendar = await getPortalCalendarMonth({ year, month });

  return (
    <AppShell
      role="teacher"
      profile={profile}
      title="School calendar"
      subtitle="Holidays, important dates, school events, and student & teacher birthdays."
      teacherAccess={teacherAccess}
    >
      {calendar.error ? (
        <p className="text-sm text-muted-foreground">{calendar.error}</p>
      ) : (
        <PortalCalendarView
          role="teacher"
          year={calendar.year}
          month={calendar.month}
          events={calendar.events || []}
          counts={calendar.counts || {}}
          backHref="/teacher"
        />
      )}
    </AppShell>
  );
}
