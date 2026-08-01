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

export function SubjectWeightsEditor({
  subjectId,
  subjectName,
  initialWeights,
  onSaved,
  compact = false,
  className,
}) {
  const [weights, setWeights] = useState(() =>
    normalizeComponentWeights(initialWeights)
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const total = weightsTotal(weights);
  const valid = total === 100;

  useEffect(() => {
    setWeights(normalizeComponentWeights(initialWeights));
  }, [
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

  return (
    <div
      className={cn(
        "rounded-xl border border-[#800000]/15 bg-white p-4",
        compact && "p-3",
        className
      )}
    >
      <div className={cn("mb-3", compact && "mb-2")}>
        <p className="font-heading text-sm font-bold text-[#3d1212]">
          Grading component weights
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Shared for this subject — registrar and assigned teachers see the same
          values. Must total 100%.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
        <div className="space-y-1">
          <Label htmlFor={`ww-${subjectId}`} className="text-xs">
            Written works %
          </Label>
          <Input
            id={`ww-${subjectId}`}
            type="number"
            min="0"
            max="100"
            value={weights.written}
            onChange={(e) => setField("written", e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`pt-${subjectId}`} className="text-xs">
            Performance %
          </Label>
          <Input
            id={`pt-${subjectId}`}
            type="number"
            min="0"
            max="100"
            value={weights.performance}
            onChange={(e) => setField("performance", e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`ex-${subjectId}`} className="text-xs">
            Examinations %
          </Label>
          <Input
            id={`ex-${subjectId}`}
            type="number"
            min="0"
            max="100"
            value={weights.assessment}
            onChange={(e) => setField("assessment", e.target.value)}
            className="h-9"
          />
        </div>
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
      </div>

      {error ? (
        <p className="mt-2 text-sm text-rose-700">{error}</p>
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
