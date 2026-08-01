"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Plus, Cloud } from "lucide-react";
import { toast } from "sonner";
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
import { computeDepEdGrade, descriptorForGrade } from "@/lib/deped-grades";
import { saveGradeRecord } from "@/actions/portal";
import { cn } from "@/lib/utils";

function makeActivityId() {
  return `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cloneRows(rows) {
  return rows.map((r) => ({
    ...r,
    written_scores: (r.written_scores || []).map((s) => ({ ...s })),
    performance_scores: (r.performance_scores || []).map((s) => ({ ...s })),
  }));
}

export function GradebookTable({
  initialRows,
  subject,
  quarter,
  sectionLabel,
}) {
  const [rows, setRows] = useState(() => cloneRows(initialRows || []));
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [clipboard, setClipboard] = useState(null);
  const saveTimer = useRef(null);
  const pendingSaves = useRef(new Set());

  const weights = useMemo(
    () => ({
      writtenWeight: Number(subject?.written_weight ?? 40),
      performanceWeight: Number(subject?.performance_weight ?? 40),
      assessmentWeight: Number(subject?.assessment_weight ?? 20),
    }),
    [
      subject?.written_weight,
      subject?.performance_weight,
      subject?.assessment_weight,
    ]
  );

  const activityMeta = useMemo(() => {
    const sample = rows[0];
    return {
      written: sample?.written_scores || [],
      performance: sample?.performance_scores || [],
    };
  }, [rows]);

  const scheduleSave = useCallback(
    (studentId) => {
      pendingSaves.current.add(studentId);
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);

      saveTimer.current = setTimeout(async () => {
        const ids = Array.from(pendingSaves.current);
        pendingSaves.current.clear();

        const snapshot = rows;
        try {
          for (const id of ids) {
            const row = snapshot.find((r) => r.student_id === id);
            if (!row) continue;
            const result = await saveGradeRecord({
              gradeId: row.id,
              studentId: row.student_id,
              subjectId: subject.id,
              quarter,
              writtenScores: row.written_scores,
              performanceScores: row.performance_scores,
              assessmentScore: row.assessment_score,
              weights,
            });
            if (result.error) throw new Error(result.error);
            if (result.data) {
              setRows((prev) =>
                prev.map((r) =>
                  r.student_id === id
                    ? {
                        ...r,
                        id: result.data.id,
                        final_transmuted_grade:
                          result.data.final_transmuted_grade,
                      }
                    : r
                )
              );
            }
          }
          setSaveState("saved");
        } catch (err) {
          setSaveState("error");
          toast.error(err.message || "Failed to save grades");
        }
      }, 700);
    },
    [rows, subject?.id, quarter, weights]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function updateScore(studentId, type, activityId, value) {
    setRows((prev) => {
      const next = prev.map((row) => {
        if (row.student_id !== studentId) return row;
        const key =
          type === "written" ? "written_scores" : "performance_scores";
        const scores = (row[key] || []).map((s) =>
          s.id === activityId
            ? { ...s, score: value === "" ? "" : Number(value) }
            : s
        );
        const computed = computeDepEdGrade({
          writtenScores: type === "written" ? scores : row.written_scores,
          performanceScores:
            type === "performance" ? scores : row.performance_scores,
          assessmentScore: row.assessment_score,
          ...weights,
        });
        return {
          ...row,
          [key]: scores,
          final_transmuted_grade: computed.transmutedGrade,
          _initial: computed.initialGrade,
        };
      });
      return next;
    });
    scheduleSave(studentId);
  }

  function updateAssessment(studentId, value) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.student_id !== studentId) return row;
        const assessment = value === "" ? "" : Number(value);
        const computed = computeDepEdGrade({
          writtenScores: row.written_scores,
          performanceScores: row.performance_scores,
          assessmentScore: assessment,
          ...weights,
        });
        return {
          ...row,
          assessment_score: assessment,
          final_transmuted_grade: computed.transmutedGrade,
          _initial: computed.initialGrade,
        };
      })
    );
    scheduleSave(studentId);
  }

  function addColumn(type) {
    const label =
      type === "written"
        ? `WW${(activityMeta.written?.length || 0) + 1}`
        : `PT${(activityMeta.performance?.length || 0) + 1}`;
    const maxStr = window.prompt(
      `Highest Possible Score (HPS) for ${label}?`,
      "100"
    );
    if (maxStr == null) return;
    const max = Number(maxStr);
    if (!max || max <= 0) {
      toast.error("Enter a valid HPS greater than 0");
      return;
    }

    const activity = {
      id: makeActivityId(),
      label,
      score: "",
      max,
    };

    setRows((prev) =>
      prev.map((row) => {
        const key =
          type === "written" ? "written_scores" : "performance_scores";
        return {
          ...row,
          [key]: [...(row[key] || []), { ...activity }],
        };
      })
    );

    rows.forEach((r) => scheduleSave(r.student_id));
    toast.success(`Added ${label} (HPS ${max})`);
  }

  function handleCopy(studentId, type, activityId) {
    const row = rows.find((r) => r.student_id === studentId);
    if (!row) return;
    if (type === "assessment") {
      setClipboard({ type, value: row.assessment_score });
      return;
    }
    const key = type === "written" ? "written_scores" : "performance_scores";
    const item = (row[key] || []).find((s) => s.id === activityId);
    setClipboard({ type, activityId, value: item?.score ?? "" });
  }

  function handlePaste(studentId, type, activityId) {
    if (!clipboard) return;
    if (type === "assessment") {
      updateAssessment(studentId, clipboard.value);
      return;
    }
    if (clipboard.type !== type) return;
    updateScore(studentId, type, activityId, clipboard.value);
  }

  const columns = useMemo(() => {
    const cols = [
      {
        id: "name",
        header: "Learner",
        cell: ({ row }) => (
          <div className="min-w-40">
            <p className="font-medium text-sm">
              {row.original.last_name}, {row.original.first_name}
            </p>
            <p className="text-[11px] text-muted-foreground">
              LRN {row.original.lrn}
            </p>
          </div>
        ),
      },
    ];

    (activityMeta.written || []).forEach((act) => {
      cols.push({
        id: `ww_${act.id}`,
        header: () => (
          <div className="text-center leading-tight">
            <div className="text-[11px] font-semibold">{act.label}</div>
            <div className="text-[10px] text-muted-foreground">
              /{act.max}
            </div>
          </div>
        ),
        cell: ({ row }) => {
          const item = (row.original.written_scores || []).find(
            (s) => s.id === act.id
          );
          return (
            <ScoreCell
              value={item?.score ?? ""}
              onChange={(v) =>
                updateScore(row.original.student_id, "written", act.id, v)
              }
              onCopy={() =>
                handleCopy(row.original.student_id, "written", act.id)
              }
              onPaste={() =>
                handlePaste(row.original.student_id, "written", act.id)
              }
            />
          );
        },
      });
    });

    (activityMeta.performance || []).forEach((act) => {
      cols.push({
        id: `pt_${act.id}`,
        header: () => (
          <div className="text-center leading-tight">
            <div className="text-[11px] font-semibold">{act.label}</div>
            <div className="text-[10px] text-muted-foreground">
              /{act.max}
            </div>
          </div>
        ),
        cell: ({ row }) => {
          const item = (row.original.performance_scores || []).find(
            (s) => s.id === act.id
          );
          return (
            <ScoreCell
              value={item?.score ?? ""}
              onChange={(v) =>
                updateScore(row.original.student_id, "performance", act.id, v)
              }
              onCopy={() =>
                handleCopy(row.original.student_id, "performance", act.id)
              }
              onPaste={() =>
                handlePaste(row.original.student_id, "performance", act.id)
              }
            />
          );
        },
      });
    });

    cols.push({
      id: "qa",
      header: () => (
        <div className="text-center leading-tight">
          <div className="text-[11px] font-semibold">QA</div>
          <div className="text-[10px] text-muted-foreground">/100</div>
        </div>
      ),
      cell: ({ row }) => (
        <ScoreCell
          value={row.original.assessment_score ?? ""}
          onChange={(v) => updateAssessment(row.original.student_id, v)}
          onCopy={() => handleCopy(row.original.student_id, "assessment")}
          onPaste={() => handlePaste(row.original.student_id, "assessment")}
        />
      ),
    });

    cols.push({
      id: "final",
      header: "TG",
      cell: ({ row }) => {
        const tg = row.original.final_transmuted_grade;
        const computed = computeDepEdGrade({
          writtenScores: row.original.written_scores,
          performanceScores: row.original.performance_scores,
          assessmentScore: row.original.assessment_score,
          ...weights,
        });
        return (
          <div className="min-w-22 text-center">
            <p
              className={cn(
                "text-sm font-semibold",
                tg != null && tg < 75 ? "text-rose-700" : "text-emerald-700"
              )}
            >
              {computed.transmutedGrade ?? "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {descriptorForGrade(computed.transmutedGrade)}
            </p>
          </div>
        );
      },
    });

    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityMeta, rows, clipboard]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#3d1212]">
            {subject?.subject_name} · Q{quarter} · {sectionLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            Weights WW {weights.writtenWeight}% · PT{" "}
            {weights.performanceWeight}% · QA {weights.assessmentWeight}%
            (DepEd DO 8, s. 2015)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => addColumn("written")}
          >
            <Plus className="size-3.5" /> Add WW Column
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => addColumn("performance")}
          >
            <Plus className="size-3.5" /> Add PT Column
          </Button>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs",
              saveState === "saved" && "text-emerald-700 bg-emerald-50",
              saveState === "saving" && "text-sky-700 bg-sky-50",
              saveState === "error" && "text-rose-700 bg-rose-50",
              saveState === "idle" && "text-muted-foreground"
            )}
          >
            <Cloud className="size-3.5" />
            {saveState === "saved" && "✓ Saved to Cloud"}
            {saveState === "saving" && "Saving…"}
            {saveState === "error" && "Save failed"}
            {saveState === "idle" && "Autosave ready"}
          </span>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-[#800000]/10 bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-[#800000]/5">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="p-1.5 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No learners in this section yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: focus a cell and press Ctrl+C / Ctrl+V to copy-paste scores.
      </p>
    </div>
  );
}

function ScoreCell({ value, onChange, onCopy, onPaste }) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      placeholder="0"
      className="h-8 w-16 px-1 text-center text-sm"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
          e.preventDefault();
          onCopy?.();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
          e.preventDefault();
          onPaste?.();
        }
      }}
    />
  );
}
