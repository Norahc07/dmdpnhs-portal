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
import { useEffect, useMemo, useState } from "react";

/**
 * Student/parent grades hub:
 * - Class Record → WW / PT / Examinations (own row only)
 * - Grades → published subject grades (no component scores)
 * Terms are always viewed one at a time (no "All").
 */
export function StudentGradesTabs({
  classRecordRows = [],
  subjectGradeRows = [],
  privacyLabel = "Your record only",
  classRecordEmpty = "No class record scores yet for you.",
  gradesEmpty = "No published subject grades yet.",
}) {
  const termsPresent = useMemo(() => {
    const set = new Set([
      ...classRecordRows.map((r) => Number(r.term)),
      ...subjectGradeRows.map((r) => Number(r.term)),
    ]);
    return GRADE_TERMS.filter((t) => set.has(t.value));
  }, [classRecordRows, subjectGradeRows]);

  const defaultTerm = String(termsPresent[0]?.value || 1);
  const [termFilter, setTermFilter] = useState(defaultTerm);

  useEffect(() => {
    if (!termsPresent.length) return;
    const stillValid = termsPresent.some((t) => String(t.value) === termFilter);
    if (!stillValid) setTermFilter(String(termsPresent[0].value));
  }, [termsPresent, termFilter]);

  const selectedTerm = Number(termFilter) || Number(defaultTerm) || 1;

  const classRecordFiltered = useMemo(
    () => classRecordRows.filter((r) => Number(r.term) === selectedTerm),
    [classRecordRows, selectedTerm]
  );

  const gradesFiltered = useMemo(
    () => subjectGradeRows.filter((r) => Number(r.term) === selectedTerm),
    [subjectGradeRows, selectedTerm]
  );

  const classCount = classRecordFiltered.length;
  const gradeCount = gradesFiltered.length;
  const selectedLabel = termLabel(selectedTerm);

  return (
    <Tabs defaultValue="class-record" className="gap-5">
      <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.28)]">
        <div className="border-b border-[#800000]/08 bg-linear-to-b from-[#faf7f5] to-white px-3 py-3 sm:px-4">
          <TabsList
            className={cn(
              "group/tabs-list h-11 w-full max-w-md gap-0.5 rounded-xl p-1",
              "bg-[#800000]/6 text-[#4a1515]/70 shadow-none"
            )}
          >
            <TabsTrigger
              value="class-record"
              className={cn(
                "group h-full flex-1 gap-2 rounded-[10px] px-3 text-[13px] font-medium",
                "transition-[color,background-color,box-shadow] duration-200 ease-out",
                "hover:text-[#3d1212]",
                "data-active:bg-white data-active:font-semibold data-active:text-[#800000]",
                "data-active:shadow-[0_1px_3px_rgba(61,18,18,0.12),0_0_0_1px_rgba(128,0,0,0.06)]",
                "data-active:ring-0"
              )}
            >
              <BookOpenCheck className="size-3.5 opacity-80" />
              <span>Class Record</span>
              <CountBadge value={classCount} />
            </TabsTrigger>
            <TabsTrigger
              value="grades"
              className={cn(
                "group h-full flex-1 gap-2 rounded-[10px] px-3 text-[13px] font-medium",
                "transition-[color,background-color,box-shadow] duration-200 ease-out",
                "hover:text-[#3d1212]",
                "data-active:bg-white data-active:font-semibold data-active:text-[#800000]",
                "data-active:shadow-[0_1px_3px_rgba(61,18,18,0.12),0_0_0_1px_rgba(128,0,0,0.06)]",
                "data-active:ring-0"
              )}
            >
              <LayoutGrid className="size-3.5 opacity-80" />
              <span>Grades</span>
              <CountBadge value={gradeCount} />
            </TabsTrigger>
          </TabsList>

          {termsPresent.length > 0 ? (
            <div
              role="tablist"
              aria-label="Select term"
              className="mt-3 flex items-center gap-1 overflow-x-auto pb-0.5"
            >
              <span className="mr-1 shrink-0 text-[10px] font-semibold tracking-[0.14em] text-[#800000]/55 uppercase">
                Term
              </span>
              {termsPresent.map((t) => (
                <TermChip
                  key={t.value}
                  active={selectedTerm === t.value}
                  onClick={() => setTermFilter(String(t.value))}
                  label={t.shortLabel}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="p-3 sm:p-4">
          <TabsContent value="class-record" className="mt-0 space-y-3 outline-none">
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Written Works, Performance Tasks, and Examinations —{" "}
              <span className="font-medium text-[#3d1212]">your scores only</span>
              {" · "}
              <span className="font-medium text-[#800000]">{selectedLabel}</span>
              {classCount > 0 ? (
                <span className="text-[#800000]/50">
                  {" "}
                  · {classCount} subject{classCount === 1 ? "" : "s"}
                </span>
              ) : null}
            </p>
            <StudentClassRecordSemestralView
              rows={classRecordFiltered}
              emptyMessage={`No class record scores for ${selectedLabel} yet.`}
              privacyLabel={privacyLabel}
            />
          </TabsContent>

          <TabsContent value="grades" className="mt-0 space-y-3 outline-none">
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Published subject grades for{" "}
              <span className="font-medium text-[#800000]">{selectedLabel}</span>
              . Open{" "}
              <span className="font-medium text-[#3d1212]">Class Record</span> for
              component scores
              {gradeCount > 0 ? (
                <span className="text-[#800000]/50">
                  {" "}
                  · {gradeCount} entr{gradeCount === 1 ? "y" : "ies"}
                </span>
              ) : null}
            </p>
            <SemestralGradesTable
              rows={gradesFiltered}
              emptyMessage={`No published grades for ${selectedLabel} yet.`}
              gradeColumnLabel={selectedLabel}
              showTermColumn={false}
            />
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}

function CountBadge({ value }) {
  if (!value) return null;
  return (
    <span className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-md bg-[#800000]/8 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#800000] group-data-active:bg-[#800000]/12">
      {value}
    </span>
  );
}

function TermChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors duration-150",
        active
          ? "bg-[#800000] text-white shadow-sm"
          : "text-[#4a1515]/75 hover:bg-[#800000]/7 hover:text-[#800000]"
      )}
    >
      {label}
    </button>
  );
}
