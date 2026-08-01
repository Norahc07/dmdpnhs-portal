"use client";

import { useState, useTransition } from "react";
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
  workflowBadgeClass,
} from "@/lib/grade-workflow";
import { cn } from "@/lib/utils";

export function ClassRecordWorkflowBar({
  assignmentId,
  initialStatus = GRADE_WORKFLOW.DRAFT,
  reviewNotes,
  onStatusChange,
}) {
  const [status, setStatus] = useState(initialStatus || GRADE_WORKFLOW.DRAFT);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const editable = canTeacherEditWorkflow(status);
  const submittable = canSubmitWorkflow(status);

  function submit() {
    startTransition(async () => {
      const result = await submitClassRecordForReview({
        assignmentId,
        notes,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setStatus(GRADE_WORKFLOW.SUBMITTED);
      onStatusChange?.(GRADE_WORKFLOW.SUBMITTED);
      toast.success("Submitted to department head for validation.");
    });
  }

  return (
    <section className="rounded-xl border border-[#800000]/15 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-heading text-sm font-bold text-[#3d1212]">
            Reading committee workflow
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Save your workbook first, then submit for department head validation.
            Registrar locks after endorsement — only then do students/parents see
            official grades.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(workflowBadgeClass(status))}
            >
              {GRADE_WORKFLOW_LABELS[status] || status}
            </Badge>
            {!editable ? (
              <span className="text-xs text-amber-800">
                Editing is paused until returned or unlocked.
              </span>
            ) : null}
          </div>
          {reviewNotes ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              Reviewer note: {reviewNotes}
            </p>
          ) : null}
        </div>
      </div>

      {submittable ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Optional note to department head"
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
            {pending ? "Submitting…" : "Submit for validation"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
