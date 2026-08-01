import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  IdCard,
  Mail,
  School,
  UserRound,
} from "lucide-react";
import { EnrollButton } from "@/components/student/EnrollButton";
import { cn } from "@/lib/utils";

const EVENT_STYLES = {
  assignment: "bg-sky-100 text-sky-800 border-sky-200",
  exam: "bg-rose-100 text-rose-800 border-rose-200",
  activity: "bg-amber-100 text-amber-800 border-amber-200",
  school_event: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

function formatName(profile) {
  const surname = profile?.last_name || "—";
  const first = profile?.first_name || "—";
  const middle = profile?.middle_name || "";
  return middle
    ? `${surname}, ${first} ${middle}`
    : `${surname}, ${first}`;
}

function initials(profile) {
  const a = (profile?.first_name || "?").slice(0, 1);
  const b = (profile?.last_name || "?").slice(0, 1);
  return `${a}${b}`.toUpperCase();
}

function DetailChip({ icon: Icon, label, value, wide }) {
  return (
    <div
      className={cn(
        "portal-detail-chip rounded-xl px-3.5 py-3",
        wide && "sm:col-span-2"
      )}
    >
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-[#ffd700]/90 uppercase">
        {Icon ? <Icon className="size-3.5 opacity-90" /> : null}
        {label}
      </div>
      <p className="font-(family-name:--font-montserrat) text-sm font-semibold text-white sm:text-[15px]">
        {value}
      </p>
    </div>
  );
}

export function StudentProfileBanner({
  profile,
  student,
  termLabel,
  enrolled,
}) {
  const section = student?.sections;

  return (
    <section className="portal-overview-banner rounded-2xl text-white">
      <div className="relative z-10">
        <div className="border-b border-white/15 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#ffd700] uppercase">
            Welcome to your dashboard
          </p>
          <h2 className="mt-1 font-heading text-xl font-bold sm:text-2xl">
            Student overview
          </h2>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:gap-6 sm:p-6">
          <div className="flex flex-col items-center gap-3 sm:items-start">
            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-1 rounded-[1.15rem] bg-linear-to-br from-[#ffd700]/70 via-white/20 to-transparent opacity-80 blur-[1px]"
              />
              <div className="relative size-28 overflow-hidden rounded-2xl border border-white/25 bg-[#5c0000]/80 shadow-xl sm:size-32">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={formatName(profile)}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-white/15 to-transparent font-(family-name:--font-montserrat) text-3xl font-bold tracking-wide text-white">
                    {initials(profile)}
                  </div>
                )}
              </div>
            </div>
            <Link
              href="/student/profile"
              className="text-xs font-medium text-[#ffd700] underline-offset-2 hover:underline"
            >
              Edit profile photo
            </Link>
          </div>

          <div className="min-w-0">
            <div className="portal-detail-chip mb-3 rounded-xl px-4 py-3.5">
              <p className="text-[11px] font-medium tracking-wide text-[#ffd700]/90 uppercase">
                Full name
              </p>
              <p className="mt-1 font-(family-name:--font-montserrat) text-xl font-bold tracking-tight sm:text-2xl">
                {formatName(profile)}
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <DetailChip
                icon={School}
                label="Grade & Section"
                value={`Grade ${student?.grade_level || "—"} · ${section?.section_name || "Unassigned"}`}
              />
              <DetailChip
                icon={IdCard}
                label="LRN"
                value={student?.lrn || "—"}
              />
              <DetailChip
                icon={CalendarDays}
                label="Current Enrollment Term"
                value={termLabel}
                wide
              />
              <DetailChip
                icon={CheckCircle2}
                label="Account Status"
                value={
                  !activated
                    ? "Pending registrar verification"
                    : enrolled
                      ? "Officially Enrolled"
                      : "Activated — awaiting section enrollment"
                }
                wide
              />
            </div>

            {activated && !enrolled && (
              <div className="mt-4">
                <EnrollButton enrolled={enrolled} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function TodaySchedulePanel({ events = [], todayLabel }) {
  return (
    <section className="rounded-2xl border border-[#800000]/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
            Today&apos;s schedule
          </p>
          <h3 className="mt-1 font-(family-name:--font-montserrat) text-lg font-bold text-[#3d1212]">
            {todayLabel}
          </h3>
        </div>
        <Link
          href="/student/calendar"
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
        >
          <CalendarDays className="size-3.5" />
          View calendar
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {events.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#800000]/20 bg-[#800000]/5 px-4 py-8 text-center text-sm text-muted-foreground">
            No assignments, exams, or school events scheduled for today.
          </div>
        )}
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-3 rounded-xl border border-[#800000]/8 px-3 py-3"
          >
            <span
              className={cn(
                "mt-0.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize",
                EVENT_STYLES[event.event_type] || EVENT_STYLES.activity
              )}
            >
              {(event.event_type || "activity").replace("_", " ")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[#3d1212]">{event.title}</p>
              {event.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {event.description}
                </p>
              )}
              {(event.start_time || event.end_time) && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  {[event.start_time, event.end_time].filter(Boolean).join(" – ")}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function EnrolledSubjectsPanel({ subjects = [] }) {
  return (
    <section className="rounded-2xl border border-[#800000]/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
          Academics
        </p>
        <h3 className="mt-1 font-(family-name:--font-montserrat) text-lg font-bold text-[#3d1212]">
          Enrolled subjects
        </h3>
      </div>

      <div className="grid gap-3">
        {subjects.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#800000]/20 px-4 py-8 text-center text-sm text-muted-foreground">
            No enrolled subjects yet. Complete enrollment or wait for subject
            assignment.
          </div>
        )}
        {subjects.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-[#800000]/10 bg-[#800000]/5 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="inline-flex items-center gap-2 font-(family-name:--font-montserrat) font-semibold text-[#3d1212]">
                  <BookOpen className="size-4 text-[#800000]" />
                  {item.subject_name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Schedule: {item.schedule_label || "TBA"}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-2 border-t border-[#800000]/8 pt-3 text-sm sm:grid-cols-3">
              <p className="inline-flex items-center gap-1.5 text-[#3d1212]">
                <UserRound className="size-3.5 text-[#800000]" />
                {item.teacher_name || "Teacher TBA"}
              </p>
              <p className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Mail className="size-3.5" />
                {item.teacher_email || "—"}
              </p>
              <p className="text-muted-foreground">
                ID: {item.teacher_code || "—"}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
