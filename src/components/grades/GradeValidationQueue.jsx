"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  endorseClassRecord,
  lockClassRecordGrades,
  returnClassRecordToTeacher,
  unlockClassRecordGrades,
} from "@/actions/grade-workflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GRADE_WORKFLOW,
  GRADE_WORKFLOW_LABELS,
  canDeptHeadReview,
  canRegistrarLock,
  workflowBadgeClass,
} from "@/lib/grade-workflow";
import { PASSING_GRADE } from "@/lib/grades-terms";
import { cn } from "@/lib/utils";

export function GradeValidationQueue({
  items = [],
  mode = "department", // department | registrar
}) {
  const [notes, setNotes] = useState({});
  const [pendingId, setPendingId] = useState(null);
  const [pending, startTransition] = useTransition();

  function noteFor(id) {
    return notes[id] || "";
  }

  function run(assignmentId, action, needsNote) {
    const text = noteFor(assignmentId).trim();
    if (needsNote && !text) {
      toast.error("Add a note first.");
      return;
    }
    setPendingId(assignmentId);
    startTransition(async () => {
      const result = await action({
        assignmentId,
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

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#800000]/20 bg-white px-5 py-10 text-center text-sm text-muted-foreground">
        No class records in the validation queue right now.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const status = item.workflow_status || GRADE_WORKFLOW.DRAFT;
        const busy = pending && pendingId === item.assignment_id;
        const failCount = item.failCount || 0;
        return (
          <article
            key={item.assignment_id}
            className="rounded-xl border border-[#800000]/10 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-base font-bold text-[#3d1212]">
                  {item.subject_name} · G{item.grade_level} {item.section_name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Teacher: {item.teacher_name} · SY {item.school_year}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={cn(workflowBadgeClass(status))}
                  >
                    {GRADE_WORKFLOW_LABELS[status] || status}
                  </Badge>
                  {failCount > 0 ? (
                    <Badge
                      variant="outline"
                      className="border-rose-200 bg-rose-50 text-rose-800"
                    >
                      {failCount} below {PASSING_GRADE}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 text-emerald-800"
                    >
                      No failing flags in current term snapshot
                    </Badge>
                  )}
                </div>
                {item.review_notes ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Last note: {item.review_notes}
                  </p>
                ) : null}
              </div>
              {mode === "department" ? (
                <Link
                  href={`/teacher/gradebook/${item.assignment_id}`}
                  className="text-sm font-medium text-[#800000] underline"
                >
                  Open class record
                </Link>
              ) : null}
            </div>

            <div className="mt-4 space-y-2">
              <Input
                placeholder="Notes (required when returning / unlocking)"
                value={noteFor(item.assignment_id)}
                onChange={(e) =>
                  setNotes((prev) => ({
                    ...prev,
                    [item.assignment_id]: e.target.value,
                  }))
                }
              />
              <div className="flex flex-wrap gap-2">
                {mode === "department" && canDeptHeadReview(status) ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      className="bg-[#800000] hover:bg-[#6a0000]"
                      onClick={() =>
                        run(item.assignment_id, endorseClassRecord, false)
                      }
                    >
                      Endorse for registrar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      className="border-rose-200 text-rose-800"
                      onClick={() =>
                        run(item.assignment_id, returnClassRecordToTeacher, true)
                      }
                    >
                      Return to teacher
                    </Button>
                  </>
                ) : null}

                {mode === "registrar" ? (
                  <>
                    {canRegistrarLock(status) ||
                    status === GRADE_WORKFLOW.ENDORSED ||
                    status === GRADE_WORKFLOW.SUBMITTED ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        className="bg-[#800000] hover:bg-[#6a0000]"
                        onClick={() =>
                          run(item.assignment_id, lockClassRecordGrades, false)
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
                          run(item.assignment_id, unlockClassRecordGrades, true)
                        }
                      >
                        Unlock
                      </Button>
                    ) : null}
                    {canDeptHeadReview(status) ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            run(item.assignment_id, endorseClassRecord, false)
                          }
                        >
                          Endorse
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          className="border-rose-200 text-rose-800"
                          onClick={() =>
                            run(
                              item.assignment_id,
                              returnClassRecordToTeacher,
                              true
                            )
                          }
                        >
                          Return
                        </Button>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
