"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Pencil,
  Save,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { saveClassRecord } from "@/actions/portal";
import { ClassRecordWorkflowBar } from "@/components/teacher/ClassRecordWorkflowBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  canTeacherEditWorkflow,
  GRADE_WORKFLOW,
} from "@/lib/grade-workflow";
import { gradeToneClass } from "@/lib/grades-terms";
import {
  ACADEMIC_REMARK_OPTIONS,
  humssTermLabel,
  mergeAcademicRecordData,
  normalizeAcademicStudentRow,
  resolveAcademicFinalGrade,
  resolveAcademicRemarks,
} from "@/lib/humss-academic-record";
import { cn } from "@/lib/utils";

function SaveIndicator({ state, editing }) {
  if (!editing && state === "idle") return null;
  const label =
    state === "saving"
      ? "Saving…"
      : state === "saved"
        ? "Saved"
        : state === "error"
          ? "Save failed"
          : "Unsaved";
  return (
    <span className="text-xs text-muted-foreground tabular-nums">{label}</span>
  );
}

export function AcademicRecordWorkspace({
  assignmentId,
  term = 1,
  sectionId,
  metadataDefaults,
  initialData,
  students = [],
  isAdvisory,
  initialWorkflowStatus = GRADE_WORKFLOW.DRAFT,
  reviewNotes = null,
}) {
  const recordTerm = Number(term) || 1;
  const termName = humssTermLabel(recordTerm);
  const hasExistingDraft = Boolean(initialData);

  const [record, setRecord] = useState(() =>
    mergeAcademicRecordData(initialData, metadataDefaults, students)
  );
  const [workflowStatus, setWorkflowStatus] = useState(
    initialWorkflowStatus || GRADE_WORKFLOW.DRAFT
  );
  const [editMode, setEditMode] = useState(!hasExistingDraft);
  const [saveState, setSaveState] = useState("idle");
  const [pending, startTransition] = useTransition();
  const mounted = useRef(false);

  const canMutate = canTeacherEditWorkflow(workflowStatus);
  const isEditing = canMutate && editMode;

  useEffect(() => {
    setRecord(mergeAcademicRecordData(initialData, metadataDefaults, students));
    setWorkflowStatus(initialWorkflowStatus || GRADE_WORKFLOW.DRAFT);
    setEditMode(!initialData);
    setSaveState("idle");
    mounted.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, recordTerm]);

  const orderedStudents = useMemo(
    () =>
      [...students].sort((a, b) => {
        const groupA = String(a.gender).toLowerCase().startsWith("m") ? 0 : 1;
        const groupB = String(b.gender).toLowerCase().startsWith("m") ? 0 : 1;
        return (
          groupA - groupB ||
          a.lastName.localeCompare(b.lastName) ||
          a.firstName.localeCompare(b.firstName)
        );
      }),
    [students]
  );

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return undefined;
    }
    if (!isEditing) return undefined;

    setSaveState("saving");
    const timer = setTimeout(() => {
      startTransition(async () => {
        const result = await saveClassRecord({
          assignmentId,
          term: recordTerm,
          data: record,
        });
        if (result?.error) {
          setSaveState("error");
          toast.error(result.error);
        } else {
          setSaveState("saved");
          if (result?.data?.workflow_status) {
            setWorkflowStatus(result.data.workflow_status);
          }
        }
      });
    }, 900);
    return () => clearTimeout(timer);
  }, [assignmentId, recordTerm, record, isEditing]);

  function updateStudent(studentId, field, value) {
    setRecord((current) => {
      const prev = normalizeAcademicStudentRow(current.students[studentId]);
      return {
        ...current,
        students: {
          ...current.students,
          [studentId]: { ...prev, [field]: value },
        },
      };
    });
  }

  function beginEdit() {
    if (!canMutate) {
      toast.error("This academic record cannot be edited in its current status.");
      return;
    }
    setEditMode(true);
  }

  function saveNow() {
    if (!canMutate) {
      toast.error("This academic record cannot be edited in its current status.");
      return;
    }
    startTransition(async () => {
      setSaveState("saving");
      const result = await saveClassRecord({
        assignmentId,
        term: recordTerm,
        data: record,
      });
      if (result?.error) {
        setSaveState("error");
        toast.error(result.error);
        return;
      }
      setSaveState("saved");
      if (result?.data?.workflow_status) {
        setWorkflowStatus(result.data.workflow_status);
      }
      setEditMode(false);
      toast.success(`${termName} academic record saved.`);
    });
  }

  const readOnlyMessage = !canMutate
    ? "Read-only while awaiting validation or while locked."
    : !isEditing
      ? "View-only. Click Edit to enter Final Grade and Remarks."
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link href="/teacher/gradebook" className="hover:text-[#800000]">
            Academic Records
          </Link>
          <ChevronRight className="size-3.5" />
          {sectionId ? (
            <>
              <Link
                href={`/teacher/gradebook/section/${sectionId}`}
                className="hover:text-[#800000]"
              >
                {record.metadata.gradeSection || "Section"}
              </Link>
              <ChevronRight className="size-3.5" />
            </>
          ) : null}
          <span className="font-medium text-[#3d1212]">
            {record.metadata.subject} · {termName}
          </span>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          {isAdvisory ? (
            <Badge className="bg-[#ffd700]/25 text-[#6a4d00] hover:bg-[#ffd700]/25">
              <ShieldCheck className="size-3" />
              Advisory
            </Badge>
          ) : null}
          <SaveIndicator state={saveState} editing={isEditing} />
          {canMutate && !isEditing ? (
            <Button
              size="sm"
              type="button"
              onClick={beginEdit}
              disabled={pending}
              className="bg-[#800000] hover:bg-[#6a0000]"
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          ) : null}
          {canMutate && isEditing ? (
            <Button
              size="sm"
              type="button"
              onClick={saveNow}
              disabled={pending}
              className="bg-[#800000] hover:bg-[#6a0000]"
            >
              <Save className="size-3.5" />
              Save
            </Button>
          ) : null}
        </div>
      </div>

      <Link
        href={
          sectionId
            ? `/teacher/gradebook/section/${sectionId}`
            : "/teacher/gradebook"
        }
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#800000] hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to academic record
      </Link>

      <div className="rounded-2xl border border-[#800000]/10 bg-white px-4 py-3 text-sm text-[#3d1212] shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <p className="font-semibold">
          {record.metadata.subject} · {termName}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Enter Final Grade and Remarks only. Quiz, activity, performance-task,
          and exam scores are not part of this academic record. Other terms stay
          on the section record and are not replaced.
        </p>
        {readOnlyMessage ? (
          <p className="mt-2 text-xs text-amber-800">{readOnlyMessage}</p>
        ) : null}
      </div>

      <ClassRecordWorkflowBar
        assignmentId={assignmentId}
        term={recordTerm}
        termLabelText={termName}
        initialStatus={workflowStatus}
        reviewNotes={reviewNotes}
        onStatusChange={setWorkflowStatus}
      />

      <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 border-collapse text-sm">
            <thead>
              <tr className="portal-panel-head text-[#3d1212]">
                <th className="px-3 py-2.5 text-left font-semibold">#</th>
                <th className="px-3 py-2.5 text-left font-semibold">Learner</th>
                <th className="px-3 py-2.5 text-left font-semibold">LRN</th>
                <th className="px-3 py-2.5 text-right font-semibold">
                  Final Grade
                </th>
                <th className="px-3 py-2.5 text-left font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {orderedStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No active students in this section yet.
                  </td>
                </tr>
              ) : null}
              {orderedStudents.map((student, index) => {
                const row = normalizeAcademicStudentRow(
                  record.students[student.id]
                );
                const grade = resolveAcademicFinalGrade(row);
                return (
                  <tr
                    key={student.id}
                    className={cn(
                      "border-b border-[#800000]/8 last:border-b-0",
                      index % 2 === 0 ? "bg-[#faf7f5]/70" : "bg-white"
                    )}
                  >
                    <td className="px-3 py-2 text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2 font-medium text-[#3d1212]">
                      {student.lastName}, {student.firstName}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {student.lrn}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isEditing ? (
                        <Input
                          inputMode="numeric"
                          value={row.finalGrade}
                          onChange={(e) =>
                            updateStudent(
                              student.id,
                              "finalGrade",
                              e.target.value
                            )
                          }
                          className="ml-auto h-8 w-20 text-right"
                          placeholder="—"
                        />
                      ) : (
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            gradeToneClass(grade)
                          )}
                        >
                          {grade ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <Input
                          list="academic-remarks"
                          value={row.remarks}
                          onChange={(e) =>
                            updateStudent(student.id, "remarks", e.target.value)
                          }
                          className="h-8 max-w-56"
                          placeholder="Passed / Failed"
                        />
                      ) : (
                        <span className="text-[#3d1212]">
                          {resolveAcademicRemarks(row)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <datalist id="academic-remarks">
          {ACADEMIC_REMARK_OPTIONS.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
