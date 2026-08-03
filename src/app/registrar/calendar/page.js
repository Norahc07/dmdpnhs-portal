import { AppShell } from "@/components/layout/AppShell";
import { PortalCalendarView } from "@/components/calendar/PortalCalendarView";
import { RegistrarSchoolEventManager } from "@/components/calendar/RegistrarSchoolEventManager";
import { getPortalCalendarMonth } from "@/actions/calendar";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "School Calendar" };

export default async function RegistrarCalendarPage({ searchParams }) {
  const params = await searchParams;
  const { profile } = await requireRole("registrar");

  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month =
    Number(params.month) >= 0 ? Number(params.month) : now.getMonth();

  const calendar = await getPortalCalendarMonth({ year, month });
  const managedEvents = (calendar.events || []).filter((e) => e.manageable);

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="School calendar"
      subtitle="Publish special days and school events for every student and teacher."
    >
      {calendar.error ? (
        <p className="text-sm text-muted-foreground">{calendar.error}</p>
      ) : (
        <div className="space-y-5">
          <RegistrarSchoolEventManager managedEvents={managedEvents} />
          <PortalCalendarView
            role="registrar"
            year={calendar.year}
            month={calendar.month}
            events={calendar.events || []}
            counts={calendar.counts || {}}
            backHref="/registrar"
          />
        </div>
      )}
    </AppShell>
  );
}
