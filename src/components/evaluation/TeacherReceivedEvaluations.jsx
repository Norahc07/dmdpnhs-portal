"use client";

import Link from "next/link";
import { STUDENT_TEACHER_QUESTIONS } from "@/lib/evaluation";
import { GRADE_TERMS, termLabel } from "@/lib/grades-terms";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TablePaginationBar,
  usePagedRows,
} from "@/components/ui/table-pagination";
import { cn } from "@/lib/utils";

function scoreLabel(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n} / 5`;
}

export function TeacherReceivedEvaluations({
  schoolYear,
  term,
  summary,
  rows = [],
}) {
  const {
    pageRows,
    page,
    setPage,
    pageSize,
    changePageSize,
    total,
    totalPages,
    start,
    end,
  } = usePagedRows(rows);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {GRADE_TERMS.map((t) => {
          const active = Number(term) === t.value;
          return (
            <Link
              key={t.value}
              href={`/teacher/evaluation?term=${t.value}`}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                active
                  ? "bg-[#800000] text-white"
                  : "border border-[#800000]/15 bg-white text-[#3d1212] hover:border-[#800000]/30"
              )}
            >
              {t.label}
            </Link>
          );
        })}
        <Badge
          variant="outline"
          className="border-[#800000]/20 bg-[#800000]/5 text-[#800000]"
        >
          SY {schoolYear}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Students rate you once per term before that term’s grades unlock.
        Earlier terms stay open for them. Responses are anonymous (no learner
        names).
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <p className="text-xs font-semibold tracking-wide text-[#800000] uppercase">
            Responses
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#3d1212]">
            {summary?.count || 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {termLabel(term)} student ratings
          </p>
        </div>
        <div className="rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <p className="text-xs font-semibold tracking-wide text-[#800000] uppercase">
            Overall average
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#3d1212]">
            {summary?.overallAverage != null
              ? `${summary.overallAverage} / 5`
              : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Across all subjects this term
          </p>
        </div>
        <div className="rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-semibold tracking-wide text-[#800000] uppercase">
            By subject
          </p>
          <div className="mt-2 space-y-1.5 text-sm">
            {(summary?.subjectBreakdown || []).length === 0 ? (
              <p className="text-muted-foreground">No ratings yet.</p>
            ) : (
              (summary.subjectBreakdown || []).map((item) => (
                <div
                  key={item.subjectName}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#800000]/08 bg-[#faf7f5] px-2.5 py-1.5"
                >
                  <span className="min-w-0 truncate font-medium text-[#3d1212]">
                    {item.subjectName}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {item.average != null ? item.average : "—"} · {item.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="portal-panel-head px-4 py-4 sm:px-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
            Student ratings
          </p>
          <h3 className="mt-1 font-heading text-sm font-bold text-[#3d1212]">
            Anonymous feedback for {termLabel(term)}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#800000]/10 hover:bg-transparent">
                <TableHead>Subject</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>Item scores</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-20 text-center text-muted-foreground"
                  >
                    No student evaluations for you in this term yet.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => {
                  const scores = row.scores || {};
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.subjects?.subject_name || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.sections
                          ? `G${row.sections.grade_level} · ${row.sections.section_name}`
                          : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {scoreLabel(row.average_score)}
                      </TableCell>
                      <TableCell className="max-w-[16rem] text-xs text-muted-foreground">
                        <ul className="space-y-0.5">
                          {STUDENT_TEACHER_QUESTIONS.map((q) => (
                            <li key={q.id} className="flex justify-between gap-2">
                              <span className="truncate capitalize">{q.id}</span>
                              <span className="tabular-nums">
                                {scores[q.id] ?? "—"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell className="max-w-[14rem] text-sm text-muted-foreground">
                        {row.comments?.trim() || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {row.updated_at
                          ? new Date(row.updated_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {rows.length > 0 ? (
          <TablePaginationBar
            page={page}
            setPage={setPage}
            pageSize={pageSize}
            changePageSize={changePageSize}
            total={total}
            totalPages={totalPages}
            start={start}
            end={end}
          />
        ) : null}
      </section>
    </div>
  );
}
