import Link from "next/link";
import { cn } from "@/lib/utils";

function CompactStat({
  title,
  value,
  href,
  hrefLabel,
  children,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border border-[#800000]/10 bg-white px-3.5 py-3 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium leading-snug text-[#5c2a2a]">
          {title}
        </p>
        {href ? (
          <Link
            href={href}
            className="shrink-0 text-[10px] font-medium text-[#800000] underline underline-offset-2"
          >
            {hrefLabel || "View"}
          </Link>
        ) : null}
      </div>
      <p className="text-2xl font-semibold tracking-tight tabular-nums text-[#800000]">
        {value}
      </p>
      {children}
    </div>
  );
}

function Chip({ label, value, tone = "default" }) {
  const tones = {
    default: "bg-[#800000]/8 text-[#5c2a2a]",
    male: "bg-sky-50 text-sky-800",
    female: "bg-rose-50 text-rose-800",
    pending: "bg-amber-50 text-amber-900",
    processing: "bg-blue-50 text-blue-900",
    ready: "bg-emerald-50 text-emerald-900",
    promoted: "bg-teal-50 text-teal-900",
    retained: "bg-orange-50 text-orange-900",
    remedial: "bg-rose-50 text-rose-900",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        tones[tone] || tones.default
      )}
    >
      <span className="opacity-70">{label}</span>
      <span>{value}</span>
    </span>
  );
}

/**
 * Dense real-time KPI counters for the registrar analytics dashboard.
 */
export function StatCards({
  kpis,
  schoolYear,
  pendingActivations = 0,
  lockedGrades = 0,
  isSample = false,
}) {
  const queue = kpis?.documentQueue || {
    pending: 0,
    processing: 0,
    ready: 0,
    total: 0,
  };
  const eosy = kpis?.eosy || { promoted: 0, retained: 0, remedial: 0 };
  const male = kpis?.male || 0;
  const female = kpis?.female || 0;
  const total = kpis?.totalEnrolled || 0;
  const malePct = total > 0 ? Math.round((male / total) * 100) : 0;
  const femalePct = total > 0 ? Math.round((female / total) * 100) : 0;

  return (
    <section className="space-y-2.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-[#3d1212]">
            Real-Time Metric Counters
          </h2>
          <p className="text-xs text-muted-foreground">
            Enrollment, faculty, documents, SNED, and EOSY · SY {schoolYear}
            {isSample ? " · sample preview data" : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4">
        <CompactStat title="Total Enrolled" value={total.toLocaleString()}>
          <div className="flex flex-wrap gap-1">
            <Chip label="M" value={male.toLocaleString()} tone="male" />
            <Chip label="F" value={female.toLocaleString()} tone="female" />
            <span className="self-center text-[10px] text-muted-foreground">
              {malePct}% / {femalePct}%
            </span>
          </div>
        </CompactStat>

        <CompactStat
          title="Active Sections"
          value={kpis?.activeSections || 0}
          href="/registrar/academics"
          hrefLabel="Manage"
        />

        <CompactStat
          title="Pending Faculty"
          value={kpis?.pendingFaculty || 0}
          href="/registrar/teachers"
          hrefLabel="Review"
        />

        <CompactStat
          title="Document Queue"
          value={queue.total}
          href="/registrar/requests"
          hrefLabel="Pipeline"
        >
          <div className="flex flex-wrap gap-1">
            <Chip label="Pending" value={queue.pending} tone="pending" />
            <Chip label="Proc." value={queue.processing} tone="processing" />
            <Chip label="Ready" value={queue.ready} tone="ready" />
          </div>
        </CompactStat>

        <CompactStat
          title="SNED / LWD Learners"
          value={kpis?.snedLearners || 0}
        />

        <CompactStat
          title="EOSY Outcomes"
          value={
            (eosy.promoted || 0) +
            (eosy.retained || 0) +
            (eosy.remedial || 0)
          }
        >
          <div className="flex flex-wrap gap-1">
            <Chip label="Promoted" value={eosy.promoted} tone="promoted" />
            <Chip label="Retained" value={eosy.retained} tone="retained" />
            <Chip label="Remedial" value={eosy.remedial} tone="remedial" />
          </div>
        </CompactStat>

        <CompactStat
          title="Pending Activations"
          value={pendingActivations || 0}
          href="/registrar/activations"
          hrefLabel="Review"
        />

        <CompactStat
          title="Locked Gradebooks"
          value={lockedGrades || 0}
          href="/registrar/grades"
          hrefLabel="Queue"
        />
      </div>
    </section>
  );
}
