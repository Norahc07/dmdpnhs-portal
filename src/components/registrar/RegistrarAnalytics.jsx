"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GRADE_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { deltaAbsolute, deltaPercent } from "@/lib/registrar-analytics";

function DeltaBadge({ current, previous, suffix = "", invert = false }) {
  const abs = deltaAbsolute(current, previous);
  const pct = deltaPercent(current, previous);
  if (abs == null || previous == null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3.5" />
        No prior year
      </span>
    );
  }
  if (abs === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3.5" />
        No change
      </span>
    );
  }

  const up = abs > 0;
  const positive = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        positive ? "text-emerald-700" : "text-rose-700"
      )}
    >
      <Icon className="size-3.5" />
      {up ? "+" : ""}
      {abs}
      {suffix}
      {pct != null ? ` (${up ? "+" : ""}${pct}%)` : ""}
    </span>
  );
}

function MetricCard({
  label,
  value,
  compareValue,
  suffix = "",
  hint,
  invert,
  showDelta = true,
}) {
  return (
    <Card size="sm" className="bg-white">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm text-[#4a1515]/80">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <p className="text-2xl font-semibold tracking-tight text-[#800000]">
          {value == null ? "—" : `${value}${suffix}`}
        </p>
        {showDelta && compareValue != null ? (
          <DeltaBadge
            current={typeof value === "number" ? value : null}
            previous={compareValue}
            suffix={suffix}
            invert={invert}
          />
        ) : null}
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function GradeCompareBars({ primary, compare, primaryLabel, compareLabel }) {
  const max = Math.max(
    1,
    ...GRADE_LEVELS.map((g) =>
      Math.max(primary?.byGrade?.[g] || 0, compare?.byGrade?.[g] || 0)
    )
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[#800000]" />
          SY {primaryLabel}
        </span>
        {compare ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-[#800000]/35" />
            SY {compareLabel}
          </span>
        ) : null}
      </div>
      <div className="space-y-2.5">
        {GRADE_LEVELS.map((grade) => {
          const a = primary?.byGrade?.[grade] || 0;
          const b = compare?.byGrade?.[grade] || 0;
          return (
            <div key={grade} className="grid grid-cols-[4.5rem_1fr] items-center gap-3">
              <p className="text-xs font-medium text-[#3d1212]">Grade {grade}</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#800000]/8">
                    <div
                      className="h-full rounded-full bg-[#800000] transition-all duration-500 ease-out"
                      style={{ width: `${(a / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-[#800000]">
                    {a}
                  </span>
                </div>
                {compare ? (
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#800000]/8">
                      <div
                        className="h-full rounded-full bg-[#800000]/35 transition-all duration-500 ease-out"
                        style={{ width: `${(b / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs text-muted-foreground">
                      {b}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendTable({ schoolYears, byYear }) {
  if (schoolYears.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No school-year data yet. Open sections for a school year to start tracking.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-160 text-left text-sm">
        <thead>
          <tr className="border-b border-[#800000]/10 text-xs tracking-wide text-[#800000]/70 uppercase">
            <th className="py-2 pr-3 font-semibold">School year</th>
            <th className="py-2 px-2 font-semibold">Enrolled</th>
            <th className="py-2 px-2 font-semibold">M / F</th>
            <th className="py-2 px-2 font-semibold">Sections</th>
            <th className="py-2 px-2 font-semibold">Teachers</th>
            <th className="py-2 px-2 font-semibold">Assignments</th>
            <th className="py-2 px-2 font-semibold">Graded</th>
            <th className="py-2 px-2 font-semibold">Pass rate</th>
            <th className="py-2 pl-2 font-semibold">Locked</th>
          </tr>
        </thead>
        <tbody>
          {schoolYears.map((year, index) => {
            const row = byYear[year];
            const prev = schoolYears[index + 1]
              ? byYear[schoolYears[index + 1]]
              : null;
            const enrolledDelta = prev
              ? deltaAbsolute(row.enrolled, prev.enrolled)
              : null;
            return (
              <tr
                key={year}
                className="border-b border-[#800000]/6 last:border-0"
              >
                <td className="py-2.5 pr-3 font-medium text-[#3d1212]">
                  SY {year}
                </td>
                <td className="px-2 py-2.5">
                  <span className="font-semibold text-[#800000]">
                    {row.enrolled}
                  </span>
                  {enrolledDelta != null && enrolledDelta !== 0 ? (
                    <span
                      className={cn(
                        "ml-1.5 text-[11px] font-medium",
                        enrolledDelta > 0 ? "text-emerald-700" : "text-rose-700"
                      )}
                    >
                      {enrolledDelta > 0 ? "+" : ""}
                      {enrolledDelta}
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-2.5 text-muted-foreground">
                  {row.male} / {row.female}
                </td>
                <td className="px-2 py-2.5">{row.sections}</td>
                <td className="px-2 py-2.5">{row.teachers}</td>
                <td className="px-2 py-2.5">{row.assignments}</td>
                <td className="px-2 py-2.5">{row.gradedLearners}</td>
                <td className="px-2 py-2.5">
                  {row.passRate == null ? "—" : `${row.passRate}%`}
                </td>
                <td className="py-2.5 pl-2">{row.lockedRecords}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RegistrarAnalytics({ analytics }) {
  const { schoolYears = [], byYear = {}, defaultYear, compareYear } = analytics || {};
  const [year, setYear] = useState(defaultYear || schoolYears[0] || "");
  const [vsYear, setVsYear] = useState(compareYear || "");

  const primary = byYear[year] || null;
  const compare = vsYear ? byYear[vsYear] || null : null;

  const genderShare = useMemo(() => {
    if (!primary || primary.enrolled === 0) {
      return { male: 0, female: 0 };
    }
    return {
      male: Math.round((primary.male / primary.enrolled) * 1000) / 10,
      female: Math.round((primary.female / primary.enrolled) * 1000) / 10,
    };
  }, [primary]);

  if (!schoolYears.length) {
    return (
      <div className="rounded-xl border border-[#800000]/10 bg-white p-5">
        <h3 className="font-heading text-base font-semibold text-[#3d1212]">
          School-year analytics
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create sections for a school year to unlock enrollment, faculty, and
          grade comparisons.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-[#800000]/10 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-heading text-base font-semibold text-[#3d1212]">
            School-year analytics
          </h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Compare enrollment, faculty coverage, and grade outcomes across
            school years. Enrollment reflects learners currently placed in that
            year’s sections.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-[#4a1515]/80">
            Focus year
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="h-9 min-w-40 rounded-md border border-[#800000]/15 bg-[#fffaf7] px-3 text-sm text-[#3d1212] outline-none focus:border-[#800000]/40"
            >
              {schoolYears.map((y) => (
                <option key={y} value={y}>
                  SY {y}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-[#4a1515]/80">
            Compare with
            <select
              value={vsYear}
              onChange={(e) => setVsYear(e.target.value)}
              className="h-9 min-w-40 rounded-md border border-[#800000]/15 bg-[#fffaf7] px-3 text-sm text-[#3d1212] outline-none focus:border-[#800000]/40"
            >
              <option value="">No comparison</option>
              {schoolYears
                .filter((y) => y !== year)
                .map((y) => (
                  <option key={y} value={y}>
                    SY {y}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Enrolled learners"
          value={primary?.enrolled ?? 0}
          compareValue={compare?.enrolled}
          hint={vsYear ? `vs SY ${vsYear}` : undefined}
        />
        <MetricCard
          label="Gender mix"
          value={primary?.enrolled ? `${primary.male} / ${primary.female}` : "—"}
          showDelta={false}
          hint={
            primary?.enrolled
              ? `${genderShare.male}% male · ${genderShare.female}% female`
              : "No enrolled learners"
          }
        />
        <MetricCard
          label="Sections opened"
          value={primary?.sections ?? 0}
          compareValue={compare?.sections}
        />
        <MetricCard
          label="Assigned teachers"
          value={primary?.teachers ?? 0}
          compareValue={compare?.teachers}
          hint={`${primary?.assignments ?? 0} subject loads`}
        />
        <MetricCard
          label="Graded learners"
          value={primary?.gradedLearners ?? 0}
          compareValue={compare?.gradedLearners}
          hint="Unique students with grade entries"
        />
        <MetricCard
          label="Pass rate"
          value={primary?.passRate}
          compareValue={compare?.passRate}
          suffix="%"
          hint={
            primary?.gradedWithFinal
              ? `${primary.passedEntries}/${primary.gradedWithFinal} finals ≥ 75`
              : "No finalized grades yet"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#800000]/10 bg-white p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-[#3d1212]">
                Enrollment by grade level
              </h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Side-by-side headcount for the selected school years.
              </p>
            </div>
            <span className="rounded-md bg-[#800000]/6 px-2 py-1 text-[11px] font-medium text-[#800000]">
              Locked records: {primary?.lockedRecords ?? 0}
              {compare
                ? ` · vs ${compare.lockedRecords}`
                : ""}
            </span>
          </div>
          <GradeCompareBars
            primary={primary}
            compare={compare}
            primaryLabel={year}
            compareLabel={vsYear}
          />
        </div>

        <div className="rounded-xl border border-[#800000]/10 bg-white p-4">
          <h4 className="mb-1 text-sm font-semibold text-[#3d1212]">
            Multi-year outlook
          </h4>
          <p className="mb-4 text-xs text-muted-foreground">
            Year-by-year snapshot for registrar planning and comparison.
          </p>
          <TrendTable schoolYears={schoolYears} byYear={byYear} />
        </div>
      </div>
    </section>
  );
}
