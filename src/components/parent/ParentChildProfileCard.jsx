import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Home,
  IdCard,
  Mail,
  Phone,
  School,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatName(profile) {
  const surname = profile?.last_name || "—";
  const first = profile?.first_name || "—";
  const middle = profile?.middle_name || "";
  return middle ? `${surname}, ${first} ${middle}` : `${surname}, ${first}`;
}

function initials(profile) {
  const a = (profile?.first_name || "?").slice(0, 1);
  const b = (profile?.last_name || "?").slice(0, 1);
  return `${a}${b}`.toUpperCase();
}

function formatBirthdate(value) {
  if (!value) return "—";
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function DetailChip({ icon: Icon, label, value, wide }) {
  return (
    <div
      className={cn(
        "portal-detail-chip rounded-xl px-3.5 py-3",
        wide && "sm:col-span-2"
      )}
    >
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-[#800000]/75 uppercase">
        {Icon ? <Icon className="size-3.5 opacity-90" /> : null}
        {label}
      </div>
      <p className="break-words font-(family-name:--font-montserrat) text-sm font-semibold text-[#3d1212] sm:text-[15px]">
        {value || "—"}
      </p>
    </div>
  );
}

/**
 * Read-only child profile card for the parent dashboard.
 */
export function ParentChildProfileCard({ child }) {
  const profile = child?.profiles || {};
  const section = child?.sections;
  const activated = child?.activation_status === "active";
  const enrolled =
    child?.status === "enrolled" ||
    child?.status === "promoted" ||
    Boolean(child?.section_id);

  const statusLabel = !activated
    ? "Pending registrar verification"
    : enrolled
      ? "Officially Enrolled"
      : "Activated — awaiting section enrollment";

  const gradesHref = `/parent/grades?studentId=${child.id}`;
  const attendanceHref = `/parent/attendance?studentId=${child.id}`;

  return (
    <section className="portal-overview-banner rounded-2xl">
      <div className="relative z-10">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#800000]/10 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#800000] uppercase">
              Linked learner
            </p>
            <h2 className="mt-1 font-heading text-xl font-bold text-[#3d1212] sm:text-2xl">
              Child profile
            </h2>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-bold",
              activated && enrolled
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-900"
            )}
          >
            {statusLabel}
          </span>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:gap-6 sm:p-6">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <div className="relative size-28 overflow-hidden rounded-full border-[3px] border-white bg-[#f3ebe8] shadow-[0_12px_28px_-12px_rgba(61,18,18,0.4)] ring-1 ring-[#800000]/15 sm:size-32">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={formatName(profile)}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#800000]/12 to-[#800000]/5 font-(family-name:--font-montserrat) text-3xl font-bold tracking-wide text-[#800000]">
                  {initials(profile)}
                </div>
              )}
            </div>
            <p className="text-center text-[11px] text-muted-foreground sm:text-left">
              Profile photo
            </p>
          </div>

          <div className="min-w-0">
            <div className="portal-detail-chip mb-3 rounded-xl px-4 py-3.5">
              <p className="text-[11px] font-medium tracking-wide text-[#800000]/75 uppercase">
                Full name
              </p>
              <p className="mt-1 font-(family-name:--font-montserrat) text-xl font-bold tracking-tight text-[#3d1212] sm:text-2xl">
                {formatName(profile)}
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <DetailChip
                icon={School}
                label="Grade & Section"
                value={`Grade ${child?.grade_level || section?.grade_level || "—"} · ${section?.section_name || "Unassigned"}`}
              />
              <DetailChip icon={IdCard} label="LRN" value={child?.lrn || "—"} />
              <DetailChip
                icon={CalendarDays}
                label="Birthdate"
                value={formatBirthdate(child?.birthdate)}
              />
              <DetailChip
                icon={UserRound}
                label="Gender"
                value={child?.gender || "—"}
              />
              <DetailChip
                icon={Phone}
                label="Contact number"
                value={child?.contact_number || "—"}
              />
              <DetailChip
                icon={Mail}
                label="Personal email"
                value={child?.personal_email || profile?.email || "—"}
              />
              <DetailChip
                icon={Home}
                label="Home address"
                value={child?.address || "—"}
                wide
              />
              <DetailChip
                icon={CheckCircle2}
                label="Enrollment status"
                value={statusLabel}
                wide
              />
              {(child?.emergency_contact_name ||
                child?.emergency_contact_number) && (
                <>
                  <DetailChip
                    icon={UserRound}
                    label="Emergency / parent contact"
                    value={child?.emergency_contact_name || "—"}
                  />
                  <DetailChip
                    icon={Phone}
                    label="Emergency contact number"
                    value={child?.emergency_contact_number || "—"}
                  />
                </>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={gradesHref}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#800000] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#6a0000]"
              >
                <BookOpen className="size-3.5" />
                View grades
              </Link>
              <Link
                href={attendanceHref}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#800000]/15 bg-white px-3.5 text-xs font-semibold text-[#3d1212] transition hover:border-[#800000]/30 hover:bg-[#faf7f5]"
              >
                <CalendarDays className="size-3.5 text-[#800000]" />
                Attendance
              </Link>
              <Link
                href="/parent/evaluation"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#800000]/15 bg-white px-3.5 text-xs font-semibold text-[#3d1212] transition hover:border-[#800000]/30 hover:bg-[#faf7f5]"
              >
                <ClipboardCheck className="size-3.5 text-[#800000]" />
                Evaluation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
