"use client";

import { BookOpenCheck, LayoutGrid } from "lucide-react";
import { SemestralGradesTable } from "@/components/student/SemestralGradesTable";
import { StudentClassRecordSemestralView } from "@/components/student/StudentClassRecordSemestralView";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { GRADE_TERMS, termLabel } from "@/lib/grades-terms";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

/**
 * Student/parent grades hub:
 * - Class Record → WW / PT / Examinations (own row only)
 * - Grades → published subject grades (no component scores)
 */
export function StudentGradesTabs({
  classRecordRows = [],
  subjectGradeRows = [],
  privacyLabel = "Your record only",
  classRecordEmpty = "No class record scores yet for you.",
  gradesEmpty = "No published subject grades yet.",
}) {
  const [termFilter, setTermFilter] = useState("all");

  const classRecordFiltered = useMemo(() => {
    if (termFilter === "all") return classRecordRows;
    const t = Number(termFilter);
    return classRecordRows.filter((r) => Number(r.term) === t);
  }, [classRecordRows, termFilter]);

  const gradesFiltered = useMemo(() => {
    if (termFilter === "all") return subjectGradeRows;
    const t = Number(termFilter);
    return subjectGradeRows.filter((r) => Number(r.term) === t);
  }, [subjectGradeRows, termFilter]);

  const termsPresent = useMemo(() => {
    const set = new Set([
      ...classRecordRows.map((r) => Number(r.term)),
      ...subjectGradeRows.map((r) => Number(r.term)),
    ]);
    return GRADE_TERMS.filter((t) => set.has(t.value));
  }, [classRecordRows, subjectGradeRows]);

  return (
    <Tabs defaultValue="class-record" className="gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-2xl border border-[#800000]/10 bg-white p-1.5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] sm:w-auto">
          <TabsTrigger
            value="class-record"
            className="h-9 gap-1.5 rounded-xl px-3 text-[#4a1515]/80 data-active:bg-[#800000]/10 data-active:font-semibold data-active:text-[#800000] data-active:shadow-none data-active:ring-1 data-active:ring-[#800000]/12"
          >
            <BookOpenCheck className="size-3.5" />
            Class Record
          </TabsTrigger>
          <TabsTrigger
            value="grades"
            className="h-9 gap-1.5 rounded-xl px-3 text-[#4a1515]/80 data-active:bg-[#800000]/10 data-active:font-semibold data-active:text-[#800000] data-active:shadow-none data-active:ring-1 data-active:ring-[#800000]/12"
          >
            <LayoutGrid className="size-3.5" />
            Grades
          </TabsTrigger>
        </TabsList>

        {termsPresent.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            <TermChip
              active={termFilter === "all"}
              onClick={() => setTermFilter("all")}
              label="All terms"
            />
            {termsPresent.map((t) => (
              <TermChip
                key={t.value}
                active={termFilter === String(t.value)}
                onClick={() => setTermFilter(String(t.value))}
                label={t.shortLabel}
              />
            ))}
          </div>
        ) : null}
      </div>

      <TabsContent value="class-record" className="space-y-3">
        <p className="rounded-xl border border-[#800000]/08 bg-[#faf7f5]/70 px-3 py-2 text-xs text-muted-foreground">
          Written Works, Performance Tasks, and Examinations from your class
          record — <span className="font-semibold text-[#3d1212]">your row only</span>
          . Classmates are never shown.
        </p>
        <StudentClassRecordSemestralView
          rows={classRecordFiltered}
          emptyMessage={
            termFilter === "all"
              ? classRecordEmpty
              : `No class record scores for ${termLabel(termFilter)} yet.`
          }
          privacyLabel={privacyLabel}
        />
      </TabsContent>

      <TabsContent value="grades" className="space-y-3">
        <p className="rounded-xl border border-[#800000]/08 bg-[#faf7f5]/70 px-3 py-2 text-xs text-muted-foreground">
          Published subject grades (term / semestral). Component scores stay in
          the Class Record tab.
        </p>
        <SemestralGradesTable
          rows={gradesFiltered}
          emptyMessage={
            termFilter === "all"
              ? gradesEmpty
              : `No published grades for ${termLabel(termFilter)} yet.`
          }
          gradeColumnLabel={
            termFilter === "all" ? "Grade" : termLabel(termFilter)
          }
          showTermColumn={termFilter === "all"}
        />
      </TabsContent>
    </Tabs>
  );
}

function TermChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-[11px] font-semibold ring-1 transition",
        active
          ? "bg-[#800000] text-white ring-[#800000]"
          : "bg-white text-[#800000] ring-[#800000]/20 hover:bg-[#800000]/5"
      )}
    >
      {label}
    </button>
  );
}
