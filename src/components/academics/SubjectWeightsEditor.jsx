"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateSubjectWeights } from "@/actions/portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_COMPONENT_WEIGHTS,
  normalizeComponentWeights,
  weightsTotal,
} from "@/lib/class-record";
import { cn } from "@/lib/utils";

const WEIGHT_FIELDS = [
  {
    key: "written",
    label: "Written works",
    short: "WW",
    hint: "Quizzes, seatwork, written drills",
    barClass: "bg-[#800000]",
  },
  {
    key: "performance",
    label: "Performance tasks",
    short: "PT",
    hint: "Projects, outputs, practical work",
    barClass: "bg-[#b45309]",
  },
  {
    key: "assessment",
    label: "Examinations",
    short: "Exam",
    hint: "Quarterly / period exams",
    barClass: "bg-[#0f766e]",
  },
];

export function SubjectWeightsEditor({
  subjectId,
  subjectName,
  initialWeights,
  onSaved,
  onCancel,
  compact = false,
  variant = "card", // card | panel
  className,
}) {
  const [weights, setWeights] = useState(() =>
    normalizeComponentWeights(initialWeights)
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const total = weightsTotal(weights);
  const valid = total === 100;
  const remaining = 100 - (Number.isFinite(total) ? total : 0);
  const panel = variant === "panel";

  useEffect(() => {
    setWeights(normalizeComponentWeights(initialWeights));
    setError("");
  }, [
    subjectId,
    initialWeights?.written,
    initialWeights?.performance,
    initialWeights?.assessment,
    initialWeights?.written_weight,
    initialWeights?.performance_weight,
    initialWeights?.assessment_weight,
  ]);

  function setField(key, value) {
    setError("");
    setWeights((current) => ({
      ...current,
      [key]: value === "" ? "" : Number(value),
    }));
  }

  function save() {
    setError("");
    const next = normalizeComponentWeights(weights);
    if (next.written + next.performance + next.assessment !== 100) {
      setError("Written + Performance + Exam weights must total 100.");
      return;
    }
    startTransition(async () => {
      const result = await updateSubjectWeights({
        subjectId,
        writtenWeight: next.written,
        performanceWeight: next.performance,
        assessmentWeight: next.assessment,
      });
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setWeights(next);
      toast.success(
        subjectName
          ? `Weights updated for ${subjectName}.`
          : "Component weights saved."
      );
      onSaved?.(next);
    });
  }

  const numericParts = WEIGHT_FIELDS.map((field) => ({
    ...field,
    value: Number(weights[field.key]) || 0,
  }));

  return (
    <div
      className={cn(
        panel
          ? "flex h-full flex-col"
          : cn(
              "rounded-xl border border-[#800000]/15 bg-white p-4",
              compact && "p-3"
            ),
        className
      )}
    >
      {!panel ? (
        <div className={cn("mb-3", compact && "mb-2")}>
          <p className="font-heading text-sm font-bold text-[#3d1212]">
            Grading component weights
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Shared for this subject — registrar and assigned teachers see the
            same values. Must total 100%.
          </p>
        </div>
      ) : null}

      <div className={cn(panel && "flex-1 space-y-6 overflow-y-auto px-5 py-5")}>
        {/* Distribution preview */}
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Distribution
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Adjust the three DepEd components until they reach 100%.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Total</p>
              <p
                className={cn(
                  "text-2xl font-semibold tabular-nums tracking-tight transition-colors",
                  valid ? "text-emerald-700" : "text-[#800000]"
                )}
              >
                {Number.isFinite(total) ? total : "—"}
                <span className="text-sm font-medium">%</span>
              </p>
            </div>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-[#800000]/10 ring-1 ring-[#800000]/10">
            <div className="flex h-full w-full">
              {numericParts.map((part) => (
                <div
                  key={part.key}
                  className={cn(
                    "h-full transition-all duration-300 ease-out first:rounded-l-full last:rounded-r-full",
                    part.barClass
                  )}
                  style={{
                    width: `${Math.max(0, Math.min(100, part.value))}%`,
                    opacity: part.value > 0 ? 1 : 0,
                  }}
                  title={`${part.label}: ${part.value}%`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {numericParts.map((part) => (
              <span key={part.key} className="inline-flex items-center gap-1.5">
                <span
                  className={cn("size-2.5 rounded-full", part.barClass)}
                  aria-hidden
                />
                {part.short} {part.value}%
              </span>
            ))}
          </div>

          <p
            className={cn(
              "text-xs transition-colors",
              valid
                ? "text-emerald-700"
                : remaining > 0
                  ? "text-amber-700"
                  : "text-rose-700"
            )}
          >
            {valid
              ? "Ready to save — weights total 100%."
              : remaining > 0
                ? `${remaining}% still needed to reach 100.`
                : `${Math.abs(remaining)}% over 100 — reduce a component.`}
          </p>
        </div>

        {/* Inputs */}
        <div
          className={cn(
            "grid gap-3",
            panel ? "grid-cols-1" : "sm:grid-cols-4 sm:items-end"
          )}
        >
          {WEIGHT_FIELDS.map((field) => (
            <div
              key={field.key}
              className={cn(
                "space-y-1.5",
                panel &&
                  "rounded-xl border border-border/70 bg-[#faf7f5] p-3.5 transition-colors focus-within:border-[#800000]/35 focus-within:bg-white"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor={`${field.key}-${subjectId}`}
                  className={cn("text-xs", panel && "text-sm font-medium")}
                >
                  {panel ? field.label : `${field.label} %`}
                </Label>
                {panel ? (
                  <span
                    className={cn(
                      "size-2.5 rounded-full",
                      field.barClass
                    )}
                    aria-hidden
                  />
                ) : null}
              </div>
              {panel ? (
                <p className="text-[11px] text-muted-foreground">{field.hint}</p>
              ) : null}
              <div className={cn(panel && "relative")}>
                <Input
                  id={`${field.key}-${subjectId}`}
                  type="number"
                  min="0"
                  max="100"
                  value={weights[field.key]}
                  onChange={(e) => setField(field.key, e.target.value)}
                  className={cn(
                    "h-9 tabular-nums",
                    panel && "h-11 pr-10 text-base"
                  )}
                />
                {panel ? (
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                ) : null}
              </div>
            </div>
          ))}

          {!panel ? (
            <div className="flex items-end gap-2">
              <div className="min-w-14">
                <p className="text-xs text-muted-foreground">Total</p>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    valid ? "text-emerald-700" : "text-rose-700"
                  )}
                >
                  {Number.isFinite(total) ? total : "—"}%
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={pending || !valid}
                onClick={save}
                className="bg-[#800000] hover:bg-[#6a0000]"
              >
                {pending ? "Saving…" : "Save weights"}
              </Button>
            </div>
          ) : null}
        </div>

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </div>

      {panel ? (
        <div className="flex gap-2 border-t bg-white px-5 py-4">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={pending}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={pending || !valid}
            onClick={save}
            className={cn(
              "bg-[#800000] hover:bg-[#6a0000]",
              onCancel ? "flex-1" : "w-full"
            )}
          >
            {pending ? "Saving…" : "Save weights"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function defaultWeightFields() {
  return {
    writtenWeight: DEFAULT_COMPONENT_WEIGHTS.written,
    performanceWeight: DEFAULT_COMPONENT_WEIGHTS.performance,
    assessmentWeight: DEFAULT_COMPONENT_WEIGHTS.assessment,
  };
}
