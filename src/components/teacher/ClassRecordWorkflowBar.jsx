"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { submitClassRecordForReview } from "@/actions/grade-workflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GRADE_WORKFLOW,
  GRADE_WORKFLOW_LABELS,
  canSubmitWorkflow,
  canTeacherEditWorkflow,
  isPendingValidation,
  workflowBadgeClass,
} from "@/lib/grade-workflow";
import { cn } from "@/lib/utils";

export function ClassRecordWorkflowBar({
  assignmentId,
  term = 1,
  termLabelText = "Term",
  initialStatus = GRADE_WORKFLOW.DRAFT,
  reviewNotes,
  onStatusChange,
}) {
  const [status, setStatus] = useState(initialStatus || GRADE_WORKFLOW.DRAFT);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const editable = canTeacherEditWorkflow(status);
  const submittable = canSubmitWorkflow(status);
  const awaitingValidation = isPendingValidation(status);

  useEffect(() => {
    setStatus(initialStatus || GRADE_WORKFLOW.DRAFT);
  }, [initialStatus, term, assignmentId]);

  function submit() {
    startTransition(async () => {
      const result = await submitClassRecordForReview({
        assignmentId,
        term,
        notes,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setStatus(GRADE_WORKFLOW.UNDER_REVIEW);
      onStatusChange?.(GRADE_WORKFLOW.UNDER_REVIEW);
      toast.success(
        `${termLabelText} submitted. Pending department head / committee validation.`
      );
    });
  }

  return (
    <section className="rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="portal-page-kicker">Class record · {termLabelText}</p>
          <p className="mt-1 font-heading text-sm font-bold text-[#3d1212]">
            Submit for validation
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Save this term&apos;s workbook, then submit. It stays pending until
            the department head / committee validates the grades. After
            validation, the registrar can lock and publish.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(workflowBadgeClass(status))}
            >
              {GRADE_WORKFLOW_LABELS[status] || status}
            </Badge>
            {awaitingValidation ? (
              <span className="text-xs text-amber-800">
                Pending process — waiting for department head / committee
                validation.
              </span>
            ) : null}
            {!editable && !awaitingValidation ? (
              <span className="text-xs text-amber-800">
                Editing is paused in this status.
              </span>
            ) : null}
          </div>
          {reviewNotes ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              Note: {reviewNotes}
            </p>
          ) : null}
        </div>
      </div>

      {submittable ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Optional note for the department head / committee"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="sm:flex-1"
          />
          <Button
            type="button"
            disabled={pending}
            onClick={submit}
            className="bg-[#800000] hover:bg-[#6a0000]"
          >
            {pending ? "Submitting…" : "Submit class record"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
