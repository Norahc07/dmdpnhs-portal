"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  School,
  ShieldCheck,
} from "lucide-react";
import { EvaluationFormPanel } from "@/components/evaluation/EvaluationFormPanel";
import { EvaluationProgressCard } from "@/components/evaluation/EvaluationProgressCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TeacherEvaluationTabs({
  schoolYear,
  sections,
  systemExisting,
  sectionExistings = {},
  progress,
}) {
  const [tab, setTab] = useState(progress?.systemDone ? "sections" : "system");
  const [selectedSectionId, setSelectedSectionId] = useState(null);

  const uniqueSections = useMemo(() => {
    const fromProgress = progress?.sections;
    if (fromProgress?.length) return fromProgress;

    const seen = new Set();
    const out = [];
    for (const s of sections || []) {
      if (!s.sectionId || seen.has(s.sectionId)) continue;
      seen.add(s.sectionId);
      out.push({
        ...s,
        done: Boolean(sectionExistings[s.sectionId]),
      });
    }
    return out;
  }, [sections, progress?.sections, sectionExistings]);

  const sectionsByGrade = useMemo(() => {
    const map = new Map();
    for (const s of uniqueSections) {
      const g = Number(s.gradeLevel) || 0;
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(s);
    }
    return Array.from(map.keys())
      .sort((a, b) => a - b)
      .map((grade) => ({
        grade,
        sections: map.get(grade),
      }));
  }, [uniqueSections]);

  const selectedSection = uniqueSections.find(
    (s) => s.sectionId === selectedSectionId
  );
  const selectedExisting = selectedSectionId
    ? sectionExistings[selectedSectionId] || null
    : null;

  const doneCount = uniqueSections.filter((s) => s.done).length;
  const allSectionsDone =
    uniqueSections.length === 0 || uniqueSections.every((s) => s.done);

  const tabs = [
    { key: "system", label: "System", hint: "Year-end digital tools" },
    { key: "sections", label: "Sections", hint: "Grade · section cards" },
  ];

  const progressItems = [
    {
      key: "system",
      label: "System / portal (year-end)",
      done: progress?.systemDone,
    },
    ...uniqueSections.map((s) => ({
      key: s.sectionId,
      label: `Grade ${s.gradeLevel} · ${s.sectionName}`,
      done: s.done,
    })),
  ];

  return (
    <div className="space-y-4">
      <EvaluationProgressCard
        title={`SY ${schoolYear} year-end evaluation`}
        complete={Boolean(progress?.complete)}
        totalCompleted={progress?.totalCompleted || 0}
        totalRequired={progress?.totalRequired || 1}
        items={progressItems}
        lockedMessage="Required after the school year: evaluate the system and every section you handled."
      />

      <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-[#800000]/10 bg-white p-1.5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setTab(item.key);
                if (item.key === "sections") setSelectedSectionId(null);
              }}
              data-active={active ? "true" : undefined}
              className={cn(
                "portal-soft-tab flex w-full min-w-0 flex-col items-center px-2 py-2.5 text-sm sm:flex-row sm:justify-center sm:gap-1.5",
                active && "is-active"
              )}
            >
              <span className="truncate">{item.label}</span>
              <span className="hidden text-[11px] font-normal opacity-75 sm:inline">
                · {item.hint}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "system" ? (
        <EvaluationFormPanel
          role="teacher"
          evaluationType="system"
          schoolYear={schoolYear}
          yearOnly
          existing={systemExisting}
          title="Evaluate digital tools for your daily work"
          description="Attendance, class record, grade distribution, and section management for this school year."
        />
      ) : uniqueSections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#800000]/20 bg-white px-5 py-10 text-center text-sm text-muted-foreground shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
            <School className="size-6" />
          </span>
          <p className="font-heading font-bold text-[#3d1212]">
            No sections assigned yet
          </p>
          <p className="mt-1">
            Complete the system evaluation; section cards appear when you have
            teaching loads or an advisory class.
          </p>
        </div>
      ) : selectedSectionId && selectedSection ? (
        <div className="space-y-3">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
          >
            <button
              type="button"
              onClick={() => setSelectedSectionId(null)}
              className="hover:text-[#800000]"
            >
              Sections
            </button>
            <ChevronRight className="size-3.5" />
            <span className="font-medium text-[#3d1212]">
              Grade {selectedSection.gradeLevel} · {selectedSection.sectionName}
            </span>
          </nav>

          <button
            type="button"
            onClick={() => setSelectedSectionId(null)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#800000] hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back to section cards
          </button>

          <EvaluationFormPanel
            key={`section-${selectedSectionId}`}
            role="teacher"
            evaluationType="section"
            schoolYear={schoolYear}
            yearOnly
            sections={uniqueSections}
            existing={selectedExisting}
            hideTargetPickers
            lockedSectionId={selectedSectionId}
            title={`Evaluate · Grade ${selectedSection.gradeLevel} ${selectedSection.sectionName}`}
            description="Rate how the portal supported this section’s attendance, class records, and grading."
            onSubmitted={() => setSelectedSectionId(null)}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
                Handled classes
              </p>
              <h2 className="mt-1 font-heading text-base font-bold text-[#3d1212]">
                Choose a grade · section to evaluate
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Completed cards stay marked so you can finish every section you
                handle.
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums",
                allSectionsDone
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-[#800000]/8 text-[#800000]"
              )}
            >
              {doneCount}/{uniqueSections.length} done
            </span>
          </div>

          {sectionsByGrade.map(({ grade, sections: gradeSections }) => (
            <section key={grade} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-sm font-bold text-[#3d1212]">
                  Grade {grade}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {gradeSections.length} section
                  {gradeSections.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {gradeSections.map((s) => {
                  const done = Boolean(s.done);
                  return (
                    <button
                      key={s.sectionId}
                      type="button"
                      onClick={() => setSelectedSectionId(s.sectionId)}
                      className={cn(
                        "group overflow-hidden rounded-2xl border bg-white text-left shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] transition",
                        done
                          ? "border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/40"
                          : "border-[#800000]/10 hover:border-[#800000]/25 hover:bg-[#faf7f5]"
                      )}
                    >
                      <div className="portal-panel-head flex items-start justify-between gap-3 p-4">
                        <div className="flex gap-3">
                          <span
                            className={cn(
                              "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
                              done
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : s.isAdvisory
                                  ? "bg-[#ffd700]/25 text-[#6a4d00] ring-[#ffd700]/40"
                                  : "bg-[#800000]/8 text-[#800000] ring-[#800000]/12"
                            )}
                          >
                            {done ? (
                              <CheckCircle2 className="size-5" />
                            ) : s.isAdvisory ? (
                              <ShieldCheck className="size-5" />
                            ) : (
                              <School className="size-5" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-heading text-base font-bold text-[#3d1212]">
                                Grade {s.gradeLevel} · {s.sectionName}
                              </p>
                              {done ? (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                  Completed
                                </Badge>
                              ) : s.isAdvisory ? (
                                <Badge className="bg-[#ffd700]/25 text-[#6a4d00] hover:bg-[#ffd700]/25">
                                  Advisory
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-[#800000]/15 bg-[#800000]/5 text-[#800000]"
                                >
                                  Pending
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {s.subjects?.length
                                ? s.subjects.join(" · ")
                                : done
                                  ? "Evaluation submitted · open to review"
                                  : "Open to rate this section"}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-[#800000] transition group-hover:translate-x-0.5" />
                      </div>
                      <div
                        className={cn(
                          "flex items-center justify-between border-t px-4 py-2.5 text-xs",
                          done
                            ? "border-emerald-100 text-emerald-800"
                            : "border-[#800000]/08 text-muted-foreground"
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          <ClipboardCheck className="size-3.5" />
                          {done ? "Finished evaluation" : "Not evaluated yet"}
                        </span>
                        <span
                          className={cn(
                            "font-semibold",
                            done ? "text-emerald-700" : "text-[#800000]"
                          )}
                        >
                          {done ? "View / update" : "Evaluate"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
