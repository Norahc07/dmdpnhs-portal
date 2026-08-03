import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export function EvaluationProgressCard({
  title,
  complete,
  totalCompleted,
  totalRequired,
  items = [],
  ctaHref,
  ctaLabel = "Open evaluation",
  lockedMessage,
}) {
  const pct =
    totalRequired > 0
      ? Math.min(100, Math.round((totalCompleted / totalRequired) * 100))
      : 0;

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] transition",
        complete
          ? "border-emerald-200/80 bg-linear-to-br from-white to-emerald-50/70"
          : "border-[#800000]/10 bg-linear-to-br from-white to-[#faf7f5]"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-heading text-sm font-bold text-[#3d1212]">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {complete
              ? "All required evaluations for this period are done."
              : lockedMessage ||
                `Complete ${totalCompleted}/${totalRequired} required evaluations.`}
          </p>
        </div>
        <span
          className={cn(
            "rounded-lg px-2 py-0.5 text-[10px] font-bold tabular-nums ring-1",
            complete
              ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
              : "bg-[#800000]/10 text-[#800000] ring-[#800000]/12"
          )}
        >
          {totalCompleted}/{totalRequired}
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#800000]/8">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            complete ? "bg-emerald-500" : "bg-[#800000]/55"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {items.length ? (
        <ul className="mt-3 space-y-1.5">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-2 text-xs text-[#3d1212]"
            >
              {item.done ? (
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="size-3.5 shrink-0 text-amber-600" />
              )}
              <span className={item.done ? "text-muted-foreground line-through" : ""}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {!complete && ctaHref ? (
        <Link
          href={ctaHref}
          className="mt-3 inline-flex text-sm font-semibold text-[#800000] underline-offset-2 hover:underline"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
