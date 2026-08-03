"use client";

import { useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, GraduationCap } from "lucide-react";
import { EvaluationFormPanel } from "@/components/evaluation/EvaluationFormPanel";
import { EvaluationProgressCard } from "@/components/evaluation/EvaluationProgressCard";
import { cn } from "@/lib/utils";

export function StudentEvaluationTabs({
  schoolYear,
  defaultTerm,
  teachers,
  systemExisting,
  teacherExistings = {},
  progress,
}) {
  const [tab, setTab] = useState(
    progress?.systemDone ? "teachers" : "system"
  );
  const [selectedTeacherKey, setSelectedTeacherKey] = useState(null);

  const tabs = [
    { key: "system", label: "System", hint: "Portal / digital process" },
    { key: "teachers", label: "Teachers", hint: "Every subject teacher" },
  ];

  const progressTeachers = progress?.teachers?.length
    ? progress.teachers
    : teachers.map((t) => ({
        ...t,
        key: `${t.teacherId}::${t.subjectId}`,
        done: Boolean(
          teacherExistings[`${t.teacherId}::${t.subjectId}`]
        ),
      }));

  const progressItems = [
    {
      key: "system",
      label: "System / portal evaluation",
      done: progress?.systemDone,
    },
    ...progressTeachers.map((t) => ({
      key: t.key,
      label: `${t.subjectName} — ${t.teacherName || "Teacher"}`,
      done: t.done,
    })),
  ];

  const selectedTeacher = progressTeachers.find(
    (t) => t.key === selectedTeacherKey
  );
  const selectedExisting = selectedTeacherKey
    ? teacherExistings[selectedTeacherKey] || null
    : null;

  const doneCount = progressTeachers.filter((t) => t.done).length;
  const allTeachersDone =
    progressTeachers.length > 0 &&
    progressTeachers.every((t) => t.done);

  return (
    <div className="space-y-4">
      <EvaluationProgressCard
        title={`Term ${defaultTerm} evaluation progress`}
        complete={Boolean(progress?.complete)}
        totalCompleted={progress?.totalCompleted || 0}
        totalRequired={progress?.totalRequired || 1}
        items={progressItems}
        lockedMessage={
          progress?.awaitingTeachers
            ? "Subject teachers are not assigned yet. Ask the registrar to set teaching loads so you can finish teacher evaluations."
            : "Finish the system evaluation and rate every subject teacher below before this term’s grades unlock."
        }
      />

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#800000]/10 bg-white p-1.5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setTab(item.key);
                if (item.key === "teachers") setSelectedTeacherKey(null);
              }}
              data-active={active ? "true" : undefined}
              className={cn(
                "portal-soft-tab flex w-full min-w-0 flex-col items-center px-2 py-2.5 text-sm sm:flex-row sm:justify-center sm:gap-1.5",
                active
                  ? "is-active bg-[#800000]/10 font-semibold text-[#800000] ring-1 ring-[#800000]/12"
                  : "font-medium text-muted-foreground"
              )}
            >
              <span className="truncate">{item.label}</span>
              <span className="hidden text-[11px] font-normal text-muted-foreground sm:inline">
                · {item.hint}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "system" ? (
        <EvaluationFormPanel
          role="student"
          evaluationType="system"
          schoolYear={schoolYear}
          defaultTerm={defaultTerm}
          existing={systemExisting}
          title="Evaluate PastraPortal"
          description="Required each term. Rate how well the portal supports grades, attendance, and digital school processes."
        />
      ) : teachers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#800000]/20 bg-white px-5 py-10 text-center shadow-[0_12px_28px_-20px_rgba(61,18,18,0.25)]">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
            <GraduationCap className="size-6" />
          </span>
          <p className="font-heading font-bold text-[#3d1212]">
            No subject teachers listed yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your section needs assigned subject teachers (teaching loads or class
            schedules) before teacher evaluations appear. Contact the registrar.
          </p>
        </div>
      ) : selectedTeacherKey && selectedTeacher ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setSelectedTeacherKey(null)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#800000] transition hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back to all teachers
          </button>
          <EvaluationFormPanel
            key={`teacher-${selectedTeacherKey}-${defaultTerm}`}
            role="student"
            evaluationType="teacher"
            schoolYear={schoolYear}
            defaultTerm={defaultTerm}
            teachers={teachers}
            existing={selectedExisting}
            hideTargetPickers
            lockedTeacherKey={selectedTeacherKey}
            title={`Evaluate · ${selectedTeacher.subjectName}`}
            description="Rate this subject teacher for the selected term. After you submit, return to the list and continue until every teacher is done."
            onSubmitted={() => setSelectedTeacherKey(null)}
          />
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <div className="portal-panel-head flex flex-wrap items-end justify-between gap-2 px-4 py-4 sm:px-5">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
                Subject teachers
              </p>
              <h2 className="mt-1 font-heading text-base font-bold text-[#3d1212]">
                Choose a teacher to evaluate
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                All subjects with assigned teachers are listed. Complete every
                one before evaluation progress is marked complete.
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums",
                allTeachersDone
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-[#800000]/8 text-[#800000]"
              )}
            >
              {doneCount}/{progressTeachers.length} done
            </span>
          </div>

          <ul className="divide-y divide-[#800000]/08">
            {progressTeachers.map((t) => (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={() => setSelectedTeacherKey(t.key)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#800000]/4 sm:px-5"
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
                      t.done
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-[#800000]/8 text-[#800000] ring-[#800000]/12"
                    )}
                  >
                    {t.done ? (
                      <CheckCircle2 className="size-5" />
                    ) : (
                      <GraduationCap className="size-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#3d1212]">
                      {t.subjectName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.teacherName || "Teacher TBA"}
                      {t.done ? " · Submitted" : " · Not yet rated"}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-[#800000]/50" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
