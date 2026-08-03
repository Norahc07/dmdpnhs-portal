import Link from "next/link";
import { Cake, CalendarDays } from "lucide-react";
import {
  groupEventsByDate,
  monthMatrix,
  styleForEventType,
  toDateKey,
} from "@/lib/portal-calendar";
import { cn } from "@/lib/utils";

const LEGEND = [
  ["holiday", "Holiday"],
  ["important", "Important"],
  ["birthday", "Birthday"],
  ["birthday_mine", "Your birthday"],
  ["exam", "Exam"],
  ["assignment", "Assignment"],
  ["school_event", "School event"],
  ["activity", "Activity"],
];

export function PortalCalendarView({
  role = "student",
  year,
  month,
  events = [],
  counts = {},
  backHref,
  backLabel = "Back to dashboard",
}) {
  const basePath = `/${role}/calendar`;
  const cells = monthMatrix(year, month);
  const byDate = groupEventsByDate(events);
  const monthLabel = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const todayKey = toDateKey(new Date());
  const myBirthday = events.find((e) => e.event_type === "birthday_mine");

  return (
    <div className="space-y-5">
      {myBirthday ? (
        <div className="flex items-start gap-3 rounded-2xl border border-[#800000]/15 bg-linear-to-r from-[#800000]/8 to-white px-4 py-3 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.25)]">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#800000]/10 text-[#800000]">
            <Cake className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
              Birthday reminder
            </p>
            <p className="mt-0.5 font-heading text-sm font-bold text-[#3d1212]">
              Your birthday is on {myBirthday.event_date} this month
            </p>
            <p className="text-xs text-muted-foreground">
              It also appears for classmates and teachers as a community reminder.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#800000]/10 bg-white px-4 py-3 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <Link
          href={backHref || `/${role}`}
          className="text-sm font-medium text-[#800000] underline-offset-2 transition hover:underline"
        >
          ← {backLabel}
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`${basePath}?year=${prev.getFullYear()}&month=${prev.getMonth()}`}
            className="rounded-lg border border-[#800000]/15 bg-[#faf7f5] px-3 py-1.5 text-sm text-[#3d1212] transition hover:border-[#800000]/30 hover:bg-white"
          >
            Previous
          </Link>
          <p className="min-w-40 text-center font-(family-name:--font-montserrat) font-semibold text-[#3d1212]">
            {monthLabel}
          </p>
          <Link
            href={`${basePath}?year=${next.getFullYear()}&month=${next.getMonth()}`}
            className="rounded-lg border border-[#800000]/15 bg-[#faf7f5] px-3 py-1.5 text-sm text-[#3d1212] transition hover:border-[#800000]/30 hover:bg-white"
          >
            Next
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[#800000]/10 bg-white px-4 py-3 text-[11px] shadow-[0_12px_28px_-20px_rgba(61,18,18,0.25)]">
        {LEGEND.map(([type, label]) => {
          const style = styleForEventType(type);
          return (
            <span
              key={type}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#800000]/08 bg-[#faf7f5] px-2.5 py-1 font-medium text-[#3d1212]"
            >
              <span className={cn("size-2 rounded-full", style.dot)} />
              {label}
            </span>
          );
        })}
        <span className="ml-auto self-center text-muted-foreground">
          {counts.holidays || 0} holidays · {counts.important || 0} important ·{" "}
          {counts.birthdays || 0} birthdays
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="portal-panel-head flex items-center gap-2 px-4 py-3 sm:px-5">
          <CalendarDays className="size-4 text-[#800000]" />
          <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
            Month grid
          </p>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-semibold tracking-wide text-[#800000] uppercase">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="border-b border-[#800000]/08 px-1 py-2.5">
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
            const hasMine = dayEvents.some((e) => e.event_type === "birthday_mine");
            const hasHoliday = dayEvents.some((e) => e.event_type === "holiday");

            return (
              <div
                key={key}
                className={cn(
                  "min-h-24 border-b border-r border-[#800000]/8 p-1.5",
                  isToday && "bg-[#800000]/5",
                  hasMine && "bg-pink-50/80",
                  hasHoliday && !hasMine && "bg-violet-50/50"
                )}
              >
                <p
                  className={cn(
                    "mb-1 text-xs font-semibold",
                    isToday || hasMine ? "text-[#800000]" : "text-[#3d1212]"
                  )}
                >
                  {date.getDate()}
                </p>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => {
                    const style = styleForEventType(event.event_type);
                    return (
                      <p
                        key={event.id}
                        className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-[#3d1212]"
                        title={event.title}
                      >
                        <span
                          className={cn(
                            "mr-1 inline-block size-1.5 rounded-full",
                            style.dot
                          )}
                        />
                        {event.title}
                      </p>
                    );
                  })}
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

      <section className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="portal-panel-head px-5 py-4">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
            Schedule
          </p>
          <h3 className="mt-1 font-(family-name:--font-montserrat) text-lg font-bold text-[#3d1212]">
            Events this month
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Holidays and important dates repeat every year. Student and teacher
            birthdays appear as community reminders. Registrar-published school
            events are visible to everyone on the portal calendar.
          </p>
        </div>
        <div className="space-y-3 p-5">
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No calendar items for this month yet.
            </p>
          )}
          {events.map((event) => {
            const style = styleForEventType(event.event_type);
            return (
              <div
                key={event.id}
                className="flex flex-wrap items-start gap-3 rounded-xl border border-[#800000]/08 bg-[#faf7f5]/60 px-3 py-3 transition hover:border-[#800000]/15 hover:bg-white"
              >
                <span
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                    style.badge
                  )}
                >
                  {style.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#3d1212]">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.event_date}
                    {event.start_time
                      ? ` · ${String(event.start_time).slice(0, 5)}`
                      : ""}
                    {event.source === "yearly" || event.source === "database_yearly"
                      ? " · every year"
                      : ""}
                    {event.source === "birthday" ? " · birthday reminder" : ""}
                  </p>
                  {event.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.description}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
