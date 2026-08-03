"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  endorseClassRecord,
  returnClassRecordToTeacher,
} from "@/actions/grade-workflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GRADE_WORKFLOW,
  GRADE_WORKFLOW_LABELS,
  canDeptHeadReview,
  workflowBadgeClass,
} from "@/lib/grade-workflow";
import { termLabel } from "@/lib/grades-terms";
import { cn } from "@/lib/utils";

export function GradeValidationQueue({ items = [] }) {
  const [notes, setNotes] = useState({});
  const [pendingId, setPendingId] = useState(null);
  const [pending, startTransition] = useTransition();

  function run(item, action, needsNote) {
    const key = item.item_key;
    const text = (notes[key] || "").trim();
    if (needsNote && !text) {
      toast.error("Add a note before returning this class record.");
      return;
    }
    setPendingId(key);
    startTransition(async () => {
      const result = await action({
        assignmentId: item.assignment_id,
        term: item.term || 1,
        notes: text || undefined,
      });
      setPendingId(null);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        action === endorseClassRecord
          ? "Grades validated. Registrar can now lock & publish."
          : "Returned to teacher for corrections."
      );
    });
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#800000]/20 bg-white px-5 py-10 text-center text-sm text-muted-foreground shadow-[0_12px_28px_-20px_rgba(61,18,18,0.25)]">
        No class records are pending validation for your department right now.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const status = item.workflow_status || GRADE_WORKFLOW.UNDER_REVIEW;
        const key = item.item_key;
        const busy = pending && pendingId === key;
        const reviewable = canDeptHeadReview(status);
        return (
          <article
            key={key}
            className="rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-heading text-base font-bold text-[#3d1212]">
                  {item.subject_name}
                  <span className="ml-2 text-sm font-medium text-muted-foreground">
                    · {termLabel(item.term || 1)}
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Grade {item.grade_level} · {item.section_name} · Teacher:{" "}
                  {item.teacher_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  SY {item.school_year} · {item.studentCount} learners
                  {item.failCount
                    ? ` · ${item.failCount} below passing`
                    : ""}
                </p>
                <Badge
                  variant="outline"
                  className={cn("mt-2", workflowBadgeClass(status))}
                >
                  {GRADE_WORKFLOW_LABELS[status] || status}
                </Badge>
                {item.review_notes ? (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                    Teacher note: {item.review_notes}
                  </p>
                ) : null}
              </div>
            </div>

            {reviewable ? (
              <div className="mt-3 space-y-2">
                <Input
                  placeholder="Optional note (required when returning)"
                  value={notes[key] || ""}
                  onChange={(e) =>
                    setNotes((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    className="bg-[#800000] hover:bg-[#6a0000]"
                    onClick={() => run(item, endorseClassRecord, false)}
                  >
                    Validate grades
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => run(item, returnClassRecordToTeacher, true)}
                  >
                    Return to teacher
                  </Button>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
