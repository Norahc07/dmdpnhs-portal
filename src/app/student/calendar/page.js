import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth-guard";
import { toDateKey } from "@/lib/student-dashboard";
import { cn } from "@/lib/utils";

export const metadata = { title: "School Calendar" };

const EVENT_DOT = {
  assignment: "bg-sky-500",
  exam: "bg-rose-500",
  activity: "bg-amber-500",
  school_event: "bg-emerald-500",
};

const EVENT_BADGE = {
  assignment: "bg-sky-100 text-sky-800 border-sky-200",
  exam: "bg-rose-100 text-rose-800 border-rose-200",
  activity: "bg-amber-100 text-amber-800 border-amber-200",
  school_event: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default async function StudentCalendarPage({ searchParams }) {
  const params = await searchParams;
  const { supabase, profile } = await requireRole("student");

  const { data: student } = await supabase
    .from("students")
    .select("id, grade_level, section_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) >= 0 ? Number(params.month) : now.getMonth();

  const monthStart = toDateKey(new Date(year, month, 1));
  const monthEnd = toDateKey(new Date(year, month + 1, 0));

  const { data: rawEvents } = await supabase
    .from("school_events")
    .select("*")
    .gte("event_date", monthStart)
    .lte("event_date", monthEnd)
    .order("event_date")
    .order("start_time");

  const events = (rawEvents || []).filter((event) => {
    const gradeOk =
      event.grade_level == null || event.grade_level === student?.grade_level;
    const sectionOk =
      event.section_id == null || event.section_id === student?.section_id;
    return gradeOk && sectionOk;
  });

  const byDate = events.reduce((acc, event) => {
    const key = event.event_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});

  const cells = monthMatrix(year, month);
  const monthLabel = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const todayKey = toDateKey(now);

  return (
    <AppShell
      role="student"
      profile={profile}
      title="School calendar"
      subtitle="Assignments, exams, activities, and school events."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/student"
          className="text-sm font-medium text-[#800000] underline-offset-2 hover:underline"
        >
          ← Back to dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/student/calendar?year=${prev.getFullYear()}&month=${prev.getMonth()}`}
            className="rounded-lg border border-[#800000]/15 bg-white px-3 py-1.5 text-sm"
          >
            Previous
          </Link>
          <p className="min-w-40 text-center font-(family-name:--font-montserrat) font-semibold text-[#3d1212]">
            {monthLabel}
          </p>
          <Link
            href={`/student/calendar?year=${next.getFullYear()}&month=${next.getMonth()}`}
            className="rounded-lg border border-[#800000]/15 bg-white px-3 py-1.5 text-sm"
          >
            Next
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-[#800000]/10 bg-[#800000]/5 text-center text-xs font-semibold tracking-wide text-[#800000] uppercase">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-1 py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, idx) => {
            if (!date) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-h-24 border-b border-r border-[#800000]/8 bg-[#f7f4f1]/60"
                />
              );
            }
            const key = toDateKey(date);
            const dayEvents = byDate[key] || [];
            const isToday = key === todayKey;

            return (
              <div
                key={key}
                className={cn(
                  "min-h-24 border-b border-r border-[#800000]/8 p-1.5",
                  isToday && "bg-[#800000]/5"
                )}
              >
                <p
                  className={cn(
                    "mb-1 text-xs font-semibold",
                    isToday ? "text-[#800000]" : "text-[#3d1212]"
                  )}
                >
                  {date.getDate()}
                </p>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <p
                      key={event.id}
                      className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-[#3d1212]"
                      title={event.title}
                    >
                      <span
                        className={cn(
                          "mr-1 inline-block size-1.5 rounded-full",
                          EVENT_DOT[event.event_type] || EVENT_DOT.activity
                        )}
                      />
                      {event.title}
                    </p>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-[10px] text-muted-foreground">
                      +{dayEvents.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <section className="mt-5 rounded-2xl border border-[#800000]/10 bg-white p-5 shadow-sm">
        <h3 className="font-(family-name:--font-montserrat) text-lg font-bold text-[#3d1212]">
          Events this month
        </h3>
        <div className="mt-4 space-y-3">
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No calendar items for this month yet.
            </p>
          )}
          {events.map((event) => (
            <div
              key={event.id}
              className="flex flex-wrap items-start gap-3 rounded-xl border border-[#800000]/8 px-3 py-3"
            >
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize",
                  EVENT_BADGE[event.event_type] || EVENT_BADGE.activity
                )}
              >
                {(event.event_type || "activity").replace("_", " ")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[#3d1212]">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {event.event_date}
                  {event.start_time
                    ? ` · ${String(event.start_time).slice(0, 5)}`
                    : ""}
                </p>
                {event.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
