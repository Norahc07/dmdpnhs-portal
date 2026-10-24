import { AppShell } from "@/components/layout/AppShell";
import { PortalCalendarView } from "@/components/calendar/PortalCalendarView";
import { TeacherClassEventManager } from "@/components/calendar/TeacherClassEventManager";
import { getPortalCalendarMonth } from "@/actions/calendar";
import { requireRole } from "@/lib/auth-guard";
import { loadTeacherHandledSections } from "@/lib/announcements";
import { getTeacherAccess } from "@/lib/teacher-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "School Calendar" };

export default async function TeacherCalendarPage({ searchParams }) {
  const params = await searchParams;
  const { profile, supabase } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);

  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month =
    Number(params.month) >= 0 ? Number(params.month) : now.getMonth();

  const calendar = await getPortalCalendarMonth({
    year,
    month,
    viewerTeacherId: teacherAccess.teacherId,
  });
  const sections = teacherAccess.teacherId
    ? await loadTeacherHandledSections(
        createAdminClient(),
        teacherAccess.teacherId
      )
    : [];
  const managedEvents = (calendar.events || []).filter(
    (event) => event.manageable && event.category === "teacher"
  );

  return (
    <AppShell
      role="teacher"
      profile={profile}
      title="School calendar"
      subtitle="Official DepEd dates stay labeled and separate. Add class events only for sections you handle."
      teacherAccess={teacherAccess}
    >
      {calendar.error ? (
        <p className="text-sm text-muted-foreground">{calendar.error}</p>
      ) : (
        <div className="space-y-5">
          <TeacherClassEventManager
            sections={sections}
            managedEvents={managedEvents}
          />
          <PortalCalendarView
            role="teacher"
            year={calendar.year}
            month={calendar.month}
            events={calendar.events || []}
            counts={calendar.counts || {}}
            backHref="/teacher"
          />
        </div>
      )}
    </AppShell>
  );
}
