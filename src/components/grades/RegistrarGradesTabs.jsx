"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, CircleDashed, Eye, X } from "lucide-react";
import { toast } from "sonner";
import {
  lockClassRecordGrades,
  unlockClassRecordGrades,
} from "@/actions/grade-workflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GRADE_WORKFLOW,
  GRADE_WORKFLOW_LABELS,
  canRegistrarLock,
  workflowBadgeClass,
} from "@/lib/grade-workflow";
import {
  GRADE_LEVELS,
  buildGradeSectionTree,
  buildSectionGradeMatrix,
  countSectionsForMode,
} from "@/lib/registrar-grades-tree";
import { cn } from "@/lib/utils";

function SideSheet({ open, onClose, title, subtitle, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-3xl flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-[#800000] uppercase">
              Section grades
            </p>
            <h2 className="font-heading text-lg font-bold text-[#3d1212]">
              {title}
            </h2>
            {subtitle ? (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function SectionGradeMatrix({ section }) {
  const matrix = useMemo(
    () => buildSectionGradeMatrix(section?.items || []),
    [section]
  );

  if (!matrix.students.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No student grade rows in these class records yet.
      </p>
    );
  }

  const subjectColPct = matrix.subjects.length
    ? Math.max(10, Math.floor(52 / matrix.subjects.length))
    : 12;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <Table className="table-fixed w-full min-w-[40rem]">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[20%]" />
          {matrix.subjects.map((s) => (
            <col
              key={s.itemKey || s.assignmentId}
              style={{ width: `${subjectColPct}%` }}
            />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow className="bg-[#800000]/3 hover:bg-[#800000]/3">
            <TableHead className="sticky left-0 z-10 bg-[#faf7f5]">
              Student
            </TableHead>
            <TableHead>LRN</TableHead>
            {matrix.subjects.map((s) => (
              <TableHead key={s.itemKey || s.assignmentId}>
                <span className="block truncate" title={s.subjectName}>
                  {s.subjectName}
                </span>
                <span className="block text-[10px] font-normal text-muted-foreground">
                  {GRADE_WORKFLOW_LABELS[s.workflow_status] || s.workflow_status}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {matrix.students.map((stu) => (
            <TableRow key={stu.studentId}>
              <TableCell className="sticky left-0 z-10 bg-white font-medium">
                <span className="block truncate">{stu.name}</span>
              </TableCell>
              <TableCell className="font-mono text-xs">
                <span className="block truncate">{stu.lrn || "—"}</span>
              </TableCell>
              {matrix.subjects.map((s) => {
                const key = s.itemKey || s.assignmentId;
                const cell = stu.grades[key];
                const value = cell?.displayGrade;
                return (
                  <TableCell
                    key={`${stu.studentId}-${key}`}
                    className="tabular-nums"
                  >
                    {value != null ? value : "—"}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SectionCard({
  section,
  statusMode,
  onViewGrades,
  notes,
  setNotes,
  pendingId,
  pending,
  runAction,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-bold text-[#3d1212]">
              {section.name}
            </h3>
            {section.complete ? (
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-emerald-800"
              >
                <CheckCircle2 className="mr-1 size-3" />
                Complete
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-900"
              >
                <CircleDashed className="mr-1 size-3" />
                Incomplete
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Grade {section.grade_level}
            {section.track_strand ? ` · ${section.track_strand}` : ""} · SY{" "}
            {section.school_year}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Locked subjects:{" "}
            <span className="font-semibold text-[#3d1212]">
              {section.ready}/{section.expected}
            </span>
            {statusMode === "awaiting" && section.awaitingCount ? (
              <>
                {" "}
                · Awaiting:{" "}
                <span className="font-semibold text-[#3d1212]">
                  {section.awaitingCount}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-[#800000]/20 text-[#800000]"
            onClick={() => onViewGrades(section)}
            disabled={!section.items.length}
          >
            <Eye className="size-3.5" />
            View grades
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide subjects" : `Subjects (${section.items.length})`}
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-[#800000]/10 px-4 py-3">
          {section.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subject records for this section yet.
            </p>
          ) : (
            <div className="space-y-3">
              {section.items.map((item) => {
                const status = item.workflow_status || GRADE_WORKFLOW.DRAFT;
                const itemKey =
                  item.item_key || `${item.assignment_id}-${item.term || 1}`;
                const busy = pending && pendingId === itemKey;
                return (
                  <div
                    key={itemKey}
                    className="rounded-lg border border-[#800000]/10 bg-[#faf7f5] p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-[#3d1212]">
                          {item.subject_name}
                          {item.term_label ? (
                            <span className="ml-1 text-sm font-normal text-muted-foreground">
                              · {item.term_label}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Teacher: {item.teacher_name} · {item.studentCount}{" "}
                          students
                        </p>
                        <Badge
                          variant="outline"
                          className={cn("mt-1.5", workflowBadgeClass(status))}
                        >
                          {GRADE_WORKFLOW_LABELS[status] || status}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {status === GRADE_WORKFLOW.LOCKED ? (
                        <Input
                          placeholder="Notes (required when unlocking)"
                          value={notes[itemKey] || ""}
                          onChange={(e) =>
                            setNotes((prev) => ({
                              ...prev,
                              [itemKey]: e.target.value,
                            }))
                          }
                        />
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {canRegistrarLock(status) ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            className="bg-[#800000] hover:bg-[#6a0000]"
                            onClick={() =>
                              runAction(
                                item.assignment_id,
                                item.term || 1,
                                itemKey,
                                lockClassRecordGrades,
                                false
                              )
                            }
                          >
                            Lock & publish
                          </Button>
                        ) : null}
                        {status === GRADE_WORKFLOW.LOCKED ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              runAction(
                                item.assignment_id,
                                item.term || 1,
                                itemKey,
                                unlockClassRecordGrades,
                                true
                              )
                            }
                          >
                            Unlock
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}

function StatusPane({
  statusMode,
  items,
  sections,
  expectedBySection,
}) {
  const tree = useMemo(
    () =>
      buildGradeSectionTree({
        items,
        sections,
        expectedBySection,
        statusMode,
      }),
    [items, sections, expectedBySection, statusMode]
  );

  const gradesWithData = GRADE_LEVELS.filter(
    (g) => tree[g]?.sectionCount > 0
  );
  const defaultGrade = gradesWithData[0] || GRADE_LEVELS[0];
  const [grade, setGrade] = useState(String(defaultGrade));
  const [viewSection, setViewSection] = useState(null);
  const [notes, setNotes] = useState({});
  const [pendingId, setPendingId] = useState(null);
  const [pending, startTransition] = useTransition();

  const activeGrade = useMemo(() => {
    const current = Number(grade);
    if (tree[current]?.sectionCount > 0) return current;
    return Number(defaultGrade);
  }, [grade, tree, defaultGrade]);

  const bucket = tree[activeGrade] || {
    sections: [],
    sectionCount: 0,
    completeCount: 0,
    subjectReady: 0,
    subjectExpected: 0,
  };

  function runAction(assignmentId, term, itemKey, action, needsNote) {
    const text = (notes[itemKey] || "").trim();
    if (needsNote && !text) {
      toast.error("Add a note first.");
      return;
    }
    setPendingId(itemKey);
    startTransition(async () => {
      const result = await action({
        assignmentId,
        term,
        notes: text || undefined,
      });
      setPendingId(null);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Updated.");
    });
  }

  if (!items.length && !sections.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#800000]/20 bg-white px-5 py-10 text-center text-sm text-muted-foreground">
        No class records in this queue right now.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-0 border-b border-[#800000]/15 sm:grid-cols-6">
        {GRADE_LEVELS.map((g) => {
          const b = tree[g];
          const count = b?.sectionCount || 0;
          const active = String(activeGrade) === String(g);
          return (
            <button
              key={g}
              type="button"
              onClick={() => setGrade(String(g))}
              className={cn(
                "relative -mb-px flex w-full min-w-0 items-center justify-center gap-1.5 border-b-[3px] px-1 py-2.5 text-sm transition-colors sm:px-2",
                active
                  ? "border-[#800000] font-bold text-[#800000]"
                  : "border-transparent font-medium text-muted-foreground hover:border-[#800000]/30 hover:text-[#5c2a2a]"
              )}
            >
              <span className="truncate">G{g}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  active
                    ? "bg-[#800000]/10 text-[#800000] ring-1 ring-[#800000]/12"
                    : statusMode === "locked" && count > 0
                      ? "bg-emerald-100 font-semibold text-emerald-800"
                      : "bg-muted font-semibold text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Grade {activeGrade}:{" "}
          {statusMode === "locked"
            ? `${bucket.sectionCount} fully locked section${bucket.sectionCount === 1 ? "" : "s"}`
            : `${bucket.sectionCount} incomplete section${bucket.sectionCount === 1 ? "" : "s"}`}{" "}
          · {bucket.subjectReady || 0}/{bucket.subjectExpected || 0} subjects
          locked
        </p>
        {statusMode === "locked" && bucket.sectionCount > 0 ? (
          <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-emerald-800"
          >
            All subjects locked
          </Badge>
        ) : statusMode === "awaiting" && bucket.sectionCount > 0 ? (
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-900"
          >
            Needs lock
          </Badge>
        ) : null}
      </div>

      {bucket.sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#800000]/20 px-5 py-8 text-center text-sm text-muted-foreground">
          {statusMode === "locked"
            ? `No fully locked sections for Grade ${activeGrade} yet.`
            : `No incomplete sections awaiting lock for Grade ${activeGrade}.`}
        </div>
      ) : (
        <div className="space-y-3">
          {bucket.sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              statusMode={statusMode}
              onViewGrades={setViewSection}
              notes={notes}
              setNotes={setNotes}
              pendingId={pendingId}
              pending={pending}
              runAction={runAction}
            />
          ))}
        </div>
      )}

      <SideSheet
        open={Boolean(viewSection)}
        onClose={() => setViewSection(null)}
        title={
          viewSection
            ? `Grade ${viewSection.grade_level} · ${viewSection.name}`
            : ""
        }
        subtitle={
          viewSection
            ? `${viewSection.items.length} subject${viewSection.items.length === 1 ? "" : "s"} · student grades by subject`
            : ""
        }
      >
        {viewSection ? <SectionGradeMatrix section={viewSection} /> : null}
      </SideSheet>
    </div>
  );
}

export function RegistrarGradesTabs({
  items = [],
  sections = [],
  expectedBySection = {},
}) {
  const [tab, setTab] = useState("awaiting"); // awaiting | locked

  const awaitingCount = useMemo(
    () =>
      countSectionsForMode({
        items,
        sections,
        expectedBySection,
        statusMode: "awaiting",
      }),
    [items, sections, expectedBySection]
  );
  const lockedCount = useMemo(
    () =>
      countSectionsForMode({
        items,
        sections,
        expectedBySection,
        statusMode: "locked",
      }),
    [items, sections, expectedBySection]
  );

  const tabs = [
    {
      key: "awaiting",
      label: "Validated (awaiting lock)",
      hint: "Submitted",
      count: awaitingCount,
    },
    {
      key: "locked",
      label: "Locked",
      hint: "Published",
      count: lockedCount,
    },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <div className="grid grid-cols-2 gap-0 border-b border-[#800000]/15">
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                "relative -mb-px flex w-full min-w-0 items-center justify-center gap-1.5 border-b-[3px] px-2 py-2.5 text-sm transition-colors sm:px-3",
                active
                  ? "border-[#800000] font-bold text-[#800000]"
                  : "border-transparent font-medium text-muted-foreground hover:border-[#800000]/30 hover:text-[#5c2a2a]"
              )}
            >
              <span className="flex min-w-0 flex-col items-center leading-tight sm:flex-row sm:gap-1.5">
                <span className="truncate">{item.label}</span>
                <span className="hidden truncate text-[11px] font-normal text-muted-foreground sm:inline">
                  · {item.hint}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  active
                    ? "bg-[#800000]/10 text-[#800000] ring-1 ring-[#800000]/12"
                    : "bg-muted font-semibold text-muted-foreground"
                )}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      <StatusPane
        statusMode={tab === "awaiting" ? "awaiting" : "locked"}
        items={items}
        sections={sections}
        expectedBySection={expectedBySection}
      />
    </div>
  );
}
