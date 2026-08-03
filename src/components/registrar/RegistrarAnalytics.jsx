"use client";

import { useState } from "react";
import { GRADE_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { deltaAbsolute } from "@/lib/registrar-analytics";

function GradeBars({ primary, primaryLabel }) {
  const max = Math.max(
    1,
    ...GRADE_LEVELS.map((g) => primary?.byGrade?.[g] || 0)
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[#800000]" />
          SY {primaryLabel}
        </span>
      </div>
      <div className="space-y-2.5">
        {GRADE_LEVELS.map((grade) => {
          const count = primary?.byGrade?.[grade] || 0;
          return (
            <div
              key={grade}
              className="grid grid-cols-[4.5rem_1fr] items-center gap-3"
            >
              <p className="text-xs font-medium text-[#3d1212]">Grade {grade}</p>
              <div className="flex items-center gap-2">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#800000]/8">
                  <div
                    className="h-full rounded-full bg-[#800000] transition-all duration-500 ease-out"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-semibold text-[#800000]">
                  {count}
                </span>
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
  const { schoolYears = [], byYear = {}, defaultYear } = analytics || {};
  const [year, setYear] = useState(defaultYear || schoolYears[0] || "");
  const primary = byYear[year] || null;

  if (!schoolYears.length) {
    return (
      <div className="rounded-2xl border border-[#800000]/10 bg-white p-5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
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
      <div className="flex flex-col gap-3 rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-heading text-base font-semibold text-[#3d1212]">
            School-year analytics
          </h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Review enrollment by grade and compare school years side by side.
            Enrollment reflects learners currently placed in that year’s
            sections.
          </p>
        </div>
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
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-[#3d1212]">
                Enrollment by grade level
              </h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Headcount for the selected school year.
              </p>
            </div>
            <span className="rounded-md bg-[#800000]/6 px-2 py-1 text-[11px] font-medium text-[#800000]">
              Locked records: {primary?.lockedRecords ?? 0}
            </span>
          </div>
          <GradeBars primary={primary} primaryLabel={year} />
        </div>

        <div className="rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
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
