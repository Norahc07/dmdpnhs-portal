"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  ChevronRight,
  Cloud,
  Pencil,
  RotateCcw,
  Save,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { saveClassRecord } from "@/actions/portal";
import { SubjectWeightsEditor } from "@/components/academics/SubjectWeightsEditor";
import { ClassRecordWorkflowBar } from "@/components/teacher/ClassRecordWorkflowBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  gradeResult,
  normalizeComponentWeights,
  normalizeStudentRow,
  numeric,
  predictExamMinimums,
} from "@/lib/class-record";
import {
  GRADE_WORKFLOW,
  canTeacherEditWorkflow,
} from "@/lib/grade-workflow";
import {
  GRADE_TERMS,
  gradeRemark,
  gradeToneClass,
  normalizeGradeTerm,
  PASSING_GRADE,
  termGradeFieldKey,
  termLabel,
} from "@/lib/grades-terms";
import { cn } from "@/lib/utils";

const WW_COUNT = 10;
const PT_COUNT = 10;
const EXAMS = ["s1", "s2", "te"];

function buildInnerTabs(termLabelText) {
  return [
    ["input", "Input Data"],
    ["semester", termLabelText],
    ["final", "Term Grades"],
    ["summary", "Passed Summary"],
    ["s1", "SM1 Analysis"],
    ["s2", "SM2 Analysis"],
    ["te", "Term Exam Analysis"],
  ];
}

function blankArray(length, value = "") {
  return Array.from({ length }, () => value);
}

/** Build workbook data for ONE term only — never copies scores from another term. */
function createData(initialData, metadataDefaults, students) {
  const source = initialData || {};
  const existingStudents = source.students || {};
  const studentData = {};

  for (const student of students) {
    const saved = existingStudents[student.id] || {};
    studentData[student.id] = normalizeStudentRow(saved);
  }

  return {
    metadata: {
      ...metadataDefaults,
      ...(source.metadata || {}),
      term: metadataDefaults.term || source.metadata?.term || "",
    },
    hps: {
      ww: [...(source.hps?.ww || []), ...blankArray(WW_COUNT)].slice(
        0,
        WW_COUNT
      ),
      pt: [...(source.hps?.pt || []), ...blankArray(PT_COUNT)].slice(
        0,
        PT_COUNT
      ),
      exams: { s1: "", s2: "", te: "", ...(source.hps?.exams || {}) },
    },
    students: studentData,
  };
}

/** Clear only WW / PT / Exam scores + HPS for this term workbook. */
function resetScoreData(current, students) {
  const studentsNext = {};
  for (const student of students) {
    const prev = current.students[student.id] || {};
    studentsNext[student.id] = {
      ...normalizeStudentRow(prev),
      ww: blankArray(WW_COUNT),
      pt: blankArray(PT_COUNT),
      exams: { s1: "", s2: "", te: "" },
    };
  }
  return {
    ...current,
    hps: {
      ww: blankArray(WW_COUNT),
      pt: blankArray(PT_COUNT),
      exams: { s1: "", s2: "", te: "" },
    },
    students: studentsNext,
  };
}

function displayNumber(value, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(digits).replace(/\.00$/, "");
}

function sum(values) {
  return values.reduce((total, value) => total + (numeric(value) ?? 0), 0);
}

function scoreInputClass() {
  return "h-8 min-w-12 rounded-none border-0 bg-transparent px-1 text-center text-xs shadow-none focus-visible:ring-1 focus-visible:ring-[#800000]";
}

export function ClassRecordWorkspace({
  assignmentId,
  term = 1,
  subjectId,
  initialWeights,
  metadataDefaults,
  initialData,
  students,
  isAdvisory,
  initialWorkflowStatus = GRADE_WORKFLOW.DRAFT,
  reviewNotes = null,
}) {
  const recordTerm = normalizeGradeTerm(term);
  const termName = termLabel(recordTerm);
  const innerTabs = useMemo(() => buildInnerTabs(termName), [termName]);
  const hasExistingDraft = Boolean(initialData);

  const [record, setRecord] = useState(() =>
    createData(initialData, metadataDefaults, students)
  );
  const [weights, setWeights] = useState(() =>
    normalizeComponentWeights(initialWeights)
  );
  const [workflowStatus, setWorkflowStatus] = useState(
    initialWorkflowStatus || GRADE_WORKFLOW.DRAFT
  );
  // Draft/returned: Edit toggles editing. New empty term starts in edit mode.
  const [editMode, setEditMode] = useState(!hasExistingDraft);
  const [saveState, setSaveState] = useState("idle");
  const [pending, startTransition] = useTransition();
  const mounted = useRef(false);

  const canMutate = canTeacherEditWorkflow(workflowStatus);
  const isEditing = canMutate && editMode;

  useEffect(() => {
    // When switching term workbooks, load that term only (no cross-term score copy)
    setRecord(createData(initialData, metadataDefaults, students));
    setWorkflowStatus(initialWorkflowStatus || GRADE_WORKFLOW.DRAFT);
    setEditMode(!initialData);
    setSaveState("idle");
    mounted.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount sync on term/assignment
  }, [assignmentId, recordTerm]);

  useEffect(() => {
    setWeights(normalizeComponentWeights(initialWeights));
  }, [
    initialWeights?.written_weight,
    initialWeights?.performance_weight,
    initialWeights?.assessment_weight,
  ]);

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

  const results = useMemo(
    () =>
      Object.fromEntries(
        students.map((student) => [
          student.id,
          gradeResult(record.students[student.id], record.hps, weights),
        ])
      ),
    [record, students, weights]
  );

  // Autosave only while actively editing this term (never writes other terms)
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

  function updateMetadata(key, value) {
    setRecord((current) => ({
      ...current,
      metadata: { ...current.metadata, [key]: value },
    }));
  }

  function updateHps(group, indexOrKey, value) {
    setRecord((current) => {
      if (group === "exams") {
        return {
          ...current,
          hps: {
            ...current.hps,
            exams: { ...current.hps.exams, [indexOrKey]: value },
          },
        };
      }
      const next = [...current.hps[group]];
      next[indexOrKey] = value;
      return { ...current, hps: { ...current.hps, [group]: next } };
    });
  }

  function updateStudent(studentId, group, indexOrKey, value) {
    setRecord((current) => {
      const student = current.students[studentId];
      let nextStudent;
      if (group === "exams") {
        nextStudent = {
          ...student,
          exams: { ...student.exams, [indexOrKey]: value },
        };
      } else if (
        group === "finalTerm" ||
        group === "term1" ||
        group === "term2"
      ) {
        nextStudent = { ...student, [group]: value };
      } else {
        const scores = [...student[group]];
        scores[indexOrKey] = value;
        nextStudent = { ...student, [group]: scores };
      }
      return {
        ...current,
        students: { ...current.students, [studentId]: nextStudent },
      };
    });
  }

  function beginEdit() {
    if (!canMutate) {
      toast.error("This class record cannot be edited in its current status.");
      return;
    }
    setEditMode(true);
  }

  function saveNow() {
    if (!canMutate) {
      toast.error("This class record cannot be edited in its current status.");
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
      toast.success(`${termName} draft saved.`);
    });
  }

  function resetScores() {
    if (!isEditing) {
      toast.error("Click Edit first, then reset score data for this term.");
      return;
    }
    const ok = window.confirm(
      `Reset Written Works, Performance Tasks, and Exam scores for ${termName} only?\n\nOther terms are not affected. Header details stay.`
    );
    if (!ok) return;
    setRecord((current) => resetScoreData(current, students));
    toast.success(`${termName} score data cleared. Save when ready.`);
  }

  const readOnlyMessage = !canMutate
    ? "Read-only while awaiting validation/publish or while locked. Scores cannot be changed."
    : !isEditing
      ? "Draft is view-only. Click Edit to change scores for this term only."
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link href="/teacher" className="hover:text-[#800000]">
            Teacher
          </Link>
          <ChevronRight className="size-3.5" />
          <Link href="/teacher/gradebook" className="hover:text-[#800000]">
            Class Records
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="font-medium text-[#3d1212]">
            {record.metadata.subject} · {termName}
          </span>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          {isAdvisory ? (
            <Badge className="bg-[#ffd700]/25 text-[#6a4d00] hover:bg-[#ffd700]/25">
              <ShieldCheck className="size-3" />
              Advisory section
            </Badge>
          ) : null}
          <SaveIndicator state={saveState} editing={isEditing} />
          {canMutate && isEditing ? (
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={resetScores}
              disabled={pending}
              className="border-[#800000]/20 text-[#800000]"
            >
              <RotateCcw className="size-3.5" />
              Reset data
            </Button>
          ) : null}
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
        href="/teacher/gradebook"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#800000] hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to class records
      </Link>

      <div className="overflow-x-auto rounded-2xl border border-[#800000]/10 bg-white p-1.5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="flex min-w-max gap-1">
          {GRADE_TERMS.map((item) => (
            <Link
              key={item.value}
              href={`/teacher/gradebook/${assignmentId}?term=${item.value}`}
              className={cn(
                "inline-flex h-10 items-center rounded-xl px-4 text-sm transition",
                item.value === recordTerm
                  ? "bg-[#800000]/10 font-semibold text-[#800000] ring-1 ring-[#800000]/12"
                  : "font-medium text-[#4a1515]/80 hover:bg-[#800000]/5 hover:text-[#800000]"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Each term is a separate class record. Scores you enter in {termName} are
        not copied to the other terms.
      </p>

      <ClassRecordWorkflowBar
        assignmentId={assignmentId}
        term={recordTerm}
        termLabelText={termName}
        initialStatus={workflowStatus}
        reviewNotes={reviewNotes}
        onStatusChange={setWorkflowStatus}
      />

      {subjectId && isEditing ? (
        <SubjectWeightsEditor
          subjectId={subjectId}
          subjectName={record.metadata.subject}
          initialWeights={weights}
          onSaved={setWeights}
        />
      ) : null}

      <Tabs defaultValue="semester" className="gap-4">
        <div className="overflow-x-auto rounded-2xl border border-[#800000]/10 bg-white p-1.5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <TabsList className="h-auto min-w-max gap-1 bg-transparent">
            {innerTabs.map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-9 rounded-xl px-3 text-[#4a1515]/80 data-active:bg-[#800000]/10 data-active:font-semibold data-active:text-[#800000] data-active:shadow-none data-active:ring-1 data-active:ring-[#800000]/12"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="input">
          <InputDataTab
            metadata={record.metadata}
            students={orderedStudents}
            termLockedLabel={termName}
            readOnly={!isEditing}
            onChange={updateMetadata}
          />
        </TabsContent>
        <TabsContent value="semester">
          <GradeSheet
            metadata={{ ...record.metadata, term: termName }}
            students={orderedStudents}
            studentData={record.students}
            hps={record.hps}
            results={results}
            weights={weights}
            readOnly={!isEditing}
            readOnlyMessage={readOnlyMessage}
            onHpsChange={isEditing ? updateHps : () => {}}
            onScoreChange={isEditing ? updateStudent : () => {}}
          />
        </TabsContent>
        <TabsContent value="final">
          <TermGradesTab
            metadata={{ ...record.metadata, term: termName }}
            students={orderedStudents}
            studentData={record.students}
            results={results}
            term={recordTerm}
            readOnly={!isEditing}
            onScoreChange={isEditing ? updateStudent : () => {}}
          />
        </TabsContent>
        <TabsContent value="summary">
          <SummaryTab
            students={orderedStudents}
            studentData={record.students}
            results={results}
            term={recordTerm}
          />
        </TabsContent>
        {EXAMS.map((exam) => (
          <TabsContent key={exam} value={exam}>
            <AnalysisTab
              exam={exam}
              metadata={{ ...record.metadata, term: termName }}
              students={orderedStudents}
              studentData={record.students}
              hps={record.hps.exams[exam]}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function SaveIndicator({ state, editing }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs",
        state === "saved" && "bg-emerald-50 text-emerald-700",
        state === "saving" && "bg-sky-50 text-sky-700",
        state === "error" && "bg-rose-50 text-rose-700",
        state === "idle" && "text-muted-foreground"
      )}
    >
      <Cloud className="size-3.5" />
      {state === "saving"
        ? "Saving…"
        : state === "saved"
          ? "Saved"
          : state === "error"
            ? "Save failed"
            : editing
              ? "Editing…"
              : "Ready"}
    </span>
  );
}

function RecordHeader({ metadata }) {
  const fields = [
    ["Region", metadata.region],
    ["Division", metadata.division],
    ["School Name", metadata.schoolName],
    ["School ID", metadata.schoolId],
    ["School Year", metadata.schoolYear],
    ["Grade & Section", metadata.gradeSection],
    ["Teacher", metadata.teacher],
    ["Term", metadata.term],
    ["Subject", metadata.subject],
    ["Track", metadata.track],
  ];
  return (
    <div className="grid border border-b-0 border-neutral-400 bg-white sm:grid-cols-2 xl:grid-cols-5">
      {fields.map(([label, value]) => (
        <div
          key={label}
          className="min-w-0 border-r border-b border-neutral-300 px-2 py-1.5"
        >
          <span className="block text-[9px] font-bold tracking-wide text-neutral-500 uppercase">
            {label}
          </span>
          <span className="block truncate text-xs font-semibold text-neutral-900">
            {value || "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

function InputDataTab({ metadata, students, onChange, termLockedLabel, readOnly }) {
  const fields = [
    ["region", "Region"],
    ["division", "Division"],
    ["schoolName", "School Name"],
    ["schoolId", "School ID"],
    ["schoolYear", "School Year"],
    ["gradeSection", "Grade & Section"],
    ["teacher", "Teacher"],
    ["term", "Term"],
    ["subject", "Subject"],
    ["track", "Track"],
  ];
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
      <section className="rounded-2xl border border-[#800000]/10 bg-white p-5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[#800000]/8 text-[#800000]">
            <BookOpenCheck className="size-4.5" />
          </span>
          <h2 className="font-heading text-lg font-bold text-[#3d1212]">
            Input Data for SHS/JHS E-Class Record
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([key, label]) => {
            const lockedTerm = key === "term";
            return (
              <label key={key} className="space-y-1.5">
                <span className="text-xs font-semibold text-[#3d1212]">
                  {label}
                </span>
                <Input
                  value={
                    lockedTerm
                      ? termLockedLabel || metadata.term || ""
                      : metadata[key] || ""
                  }
                  onChange={(event) => onChange(key, event.target.value)}
                  placeholder={`Enter ${label.toLowerCase()}`}
                  disabled={lockedTerm || readOnly}
                  readOnly={lockedTerm || readOnly}
                />
              </label>
            );
          })}
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold text-[#3d1212]">
              Exam grades display date (students/parents)
            </span>
            <Input
              type="date"
              value={String(metadata.examRevealDate || "").slice(0, 10)}
              onChange={(event) => onChange("examRevealDate", event.target.value)}
              disabled={readOnly}
              readOnly={readOnly}
            />
            <span className="block text-[11px] text-muted-foreground">
              Until this date (or until S1/S2/TE are finished, or the record is
              locked), learners see Written/Performance live but not real exam
              scores — only temporary min-to-pass predictions.
            </span>
          </label>
        </div>
      </section>
      <LearnerRoster students={students} />
    </div>
  );
}

function LearnerRoster({ students }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <div className="portal-panel-head flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[#800000]/8 text-[#800000]">
            <Users className="size-4.5" />
          </span>
          <h2 className="font-heading font-bold text-[#3d1212]">
            Learners&apos; Names
          </h2>
        </div>
        <Badge variant="outline">{students.length} learners</Badge>
      </div>
      <div className="max-h-130 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#800000]/5 text-left text-xs">
            <tr>
              <th className="px-3 py-2">No.</th>
              <th className="px-3 py-2">Learner</th>
              <th className="px-3 py-2">LRN</th>
            </tr>
          </thead>
          <tbody>
            <GenderRows students={students}>
              {(student, index) => (
                <tr key={student.id} className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {student.lastName}, {student.firstName}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{student.lrn}</td>
                </tr>
              )}
            </GenderRows>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GenderRows({ students, children, colSpan = 3 }) {
  const groups = [
    ["MALE", students.filter((s) => String(s.gender).toLowerCase().startsWith("m"))],
    [
      "FEMALE",
      students.filter((s) => String(s.gender).toLowerCase().startsWith("f")),
    ],
    [
      "UNSPECIFIED",
      students.filter((s) => {
        const gender = String(s.gender).toLowerCase();
        return !gender.startsWith("m") && !gender.startsWith("f");
      }),
    ],
  ].filter(([, list]) => list.length);

  let position = 0;
  return groups.flatMap(([label, list]) => {
    const rows = [
      <tr key={`${label}-header`} className="bg-neutral-100">
        <td
          colSpan={colSpan}
          className="px-3 py-1 text-[10px] font-bold tracking-widest text-neutral-600"
        >
          {label}
        </td>
      </tr>,
    ];
    list.forEach((student) => {
      rows.push(children(student, position));
      position += 1;
    });
    return rows;
  });
}

function GradeSheet({
  metadata,
  students,
  studentData,
  hps,
  results,
  weights,
  readOnly = false,
  readOnlyMessage = null,
  onHpsChange,
  onScoreChange,
}) {
  const w = normalizeComponentWeights(weights);
  const tableCell = "border border-neutral-400 p-1 text-center text-[10px]";
  const predictions = useMemo(
    () =>
      Object.fromEntries(
        students.map((student) => [
          student.id,
          predictExamMinimums(
            studentData[student.id],
            hps,
            weights,
            PASSING_GRADE
          ),
        ])
      ),
    [students, studentData, hps, weights]
  );

  return (
    <section>
      <RecordHeader metadata={metadata} />
      {readOnly && readOnlyMessage ? (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {readOnlyMessage}
        </p>
      ) : null}
      <p className="mb-2 text-[11px] text-muted-foreground">
        Blank S1 / S2 / TE cells show a temporary{" "}
        <span className="font-semibold text-[#800000]">min-to-pass</span>{" "}
        prediction (to reach TG {PASSING_GRADE}). Replace with the real score
        when available — learners only see real exams after the display date,
        when all exams are finished, or when the record is locked.
      </p>
      <div className="overflow-auto border border-neutral-400 bg-white shadow-sm">
        <table className="min-w-425 border-collapse text-xs">
          <thead>
            <tr className="bg-neutral-100 font-bold">
              <th
                rowSpan={2}
                className={cn(
                  tableCell,
                  "sticky left-0 z-10 min-w-50 bg-neutral-100"
                )}
              >
                LEARNERS&apos; NAMES
              </th>
              <th colSpan={13} className={tableCell}>
                WRITTEN WORKS ({w.written}%)
              </th>
              <th colSpan={13} className={tableCell}>
                PERFORMANCE TASKS ({w.performance}%)
              </th>
              <th colSpan={5} className={tableCell}>
                EXAMINATIONS ({w.assessment}%)
              </th>
              <th rowSpan={2} className={tableCell}>
                Initial Grade
              </th>
              <th rowSpan={2} className={tableCell}>
                Quarterly Grade
              </th>
            </tr>
            <tr className="bg-neutral-50">
              {blankArray(WW_COUNT).map((_, index) => (
                <th key={`ww-${index}`} className={tableCell}>
                  {index + 1}
                </th>
              ))}
              {["Total", "PS", "WS"].map((label) => (
                <th key={`ww-${label}`} className={tableCell}>
                  {label}
                </th>
              ))}
              {blankArray(PT_COUNT).map((_, index) => (
                <th key={`pt-${index}`} className={tableCell}>
                  {index + 1}
                </th>
              ))}
              {["Total", "PS", "WS"].map((label) => (
                <th key={`pt-${label}`} className={tableCell}>
                  {label}
                </th>
              ))}
              {["S1", "S2", "TE", "PS", "WS"].map((label) => (
                <th key={label} className={tableCell}>
                  {label}
                </th>
              ))}
            </tr>
            <tr className="bg-amber-50">
              <th
                className={cn(
                  tableCell,
                  "sticky left-0 z-10 bg-amber-50 text-left"
                )}
              >
                HIGHEST POSSIBLE SCORE
              </th>
              {hps.ww.map((value, index) => (
                <th key={`ww-hps-${index}`} className={tableCell}>
                  <Input
                    type="number"
                    min="0"
                    value={value}
                    disabled={readOnly}
                    onChange={(e) => onHpsChange("ww", index, e.target.value)}
                    className={scoreInputClass()}
                  />
                </th>
              ))}
              <th className={tableCell}>{sum(hps.ww) || "—"}</th>
              <th className={tableCell}>100</th>
              <th className={tableCell}>{w.written}%</th>
              {hps.pt.map((value, index) => (
                <th key={`pt-hps-${index}`} className={tableCell}>
                  <Input
                    type="number"
                    min="0"
                    value={value}
                    disabled={readOnly}
                    onChange={(e) => onHpsChange("pt", index, e.target.value)}
                    className={scoreInputClass()}
                  />
                </th>
              ))}
              <th className={tableCell}>{sum(hps.pt) || "—"}</th>
              <th className={tableCell}>100</th>
              <th className={tableCell}>{w.performance}%</th>
              {EXAMS.map((exam) => (
                <th key={`${exam}-hps`} className={tableCell}>
                  <Input
                    type="number"
                    min="0"
                    value={hps.exams[exam]}
                    disabled={readOnly}
                    onChange={(e) => onHpsChange("exams", exam, e.target.value)}
                    className={scoreInputClass()}
                  />
                </th>
              ))}
              <th className={tableCell}>100</th>
              <th className={tableCell}>{w.assessment}%</th>
              <th className={tableCell} />
              <th className={tableCell} />
            </tr>
          </thead>
          <tbody>
            <GenderRows students={students} colSpan={34}>
              {(student, index) => {
                const row = studentData[student.id];
                const result = results[student.id];
                const pred = predictions[student.id];
                return (
                  <tr key={student.id}>
                    <td
                      className={cn(
                        tableCell,
                        "sticky left-0 z-5 bg-white text-left font-medium"
                      )}
                    >
                      {index + 1}. {student.lastName}, {student.firstName}
                    </td>
                    {row.ww.map((value, i) => (
                      <ScoreTd
                        key={`ww-${i}`}
                        value={value}
                        disabled={readOnly}
                        onChange={(v) =>
                          onScoreChange(student.id, "ww", i, v)
                        }
                      />
                    ))}
                    <ResultCells result={result.ww} />
                    {row.pt.map((value, i) => (
                      <ScoreTd
                        key={`pt-${i}`}
                        value={value}
                        disabled={readOnly}
                        onChange={(v) =>
                          onScoreChange(student.id, "pt", i, v)
                        }
                      />
                    ))}
                    <ResultCells result={result.pt} />
                    {EXAMS.map((exam) => {
                      const actual = row.exams[exam];
                      const hasActual = numeric(actual) != null;
                      const minPass = pred?.[exam];
                      const hint =
                        !hasActual && minPass != null
                          ? pred.impossible
                            ? `need ${displayNumber(minPass, 0)}*`
                            : pred.alreadyPassingWithoutBlanks
                              ? "≥0"
                              : `≥${displayNumber(minPass, 0)}`
                          : undefined;
                      return (
                        <ScoreTd
                          key={exam}
                          value={actual}
                          disabled={readOnly}
                          placeholder={hint}
                          title={
                            hint
                              ? pred.impossible
                                ? `Even perfect on blank exams may not reach TG ${PASSING_GRADE}`
                                : `Temporary min to pass (TG ${PASSING_GRADE})`
                              : undefined
                          }
                          onChange={(v) =>
                            onScoreChange(student.id, "exams", exam, v)
                          }
                        />
                      );
                    })}
                    <td className={tableCell}>
                      {displayNumber(result.exams.ps)}
                    </td>
                    <td className={tableCell}>
                      {displayNumber(result.exams.ws)}
                    </td>
                    <td className={cn(tableCell, "font-semibold")}>
                      {displayNumber(result.initial)}
                    </td>
                    <td className={cn(tableCell, "font-bold text-[#800000]")}>
                      {displayNumber(result.quarterly, 0)}
                    </td>
                  </tr>
                );
              }}
            </GenderRows>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScoreTd({
  value,
  onChange,
  disabled = false,
  placeholder,
  title,
}) {
  return (
    <td className="border border-neutral-400 p-0">
      <Input
        type="number"
        min="0"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        title={title}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          scoreInputClass(),
          !value && placeholder
            ? "placeholder:text-[#800000]/55 placeholder:italic"
            : null
        )}
      />
    </td>
  );
}

function ResultCells({ result }) {
  return (
    <>
      <td className="border border-neutral-400 p-1 text-center text-[10px]">
        {displayNumber(result.total)}
      </td>
      <td className="border border-neutral-400 p-1 text-center text-[10px]">
        {displayNumber(result.ps)}
      </td>
      <td className="border border-neutral-400 p-1 text-center text-[10px]">
        {displayNumber(result.ws)}
      </td>
    </>
  );
}

function TermGradesTab({
  metadata,
  students,
  studentData,
  results,
  term = 1,
  readOnly = false,
  onScoreChange,
}) {
  const fieldKey = termGradeFieldKey(term);
  const label = termLabel(term);

  return (
    <section>
      <RecordHeader metadata={metadata} />
      <div className="overflow-auto border border-neutral-400 bg-white">
        <table className="w-full min-w-120 border-collapse text-sm">
          <thead className="bg-neutral-100">
            <tr>
              <th className="border border-neutral-400 p-2 text-left">
                LEARNERS&apos; NAMES
              </th>
              <th className="border border-neutral-400 p-2">{label}</th>
              <th className="border border-neutral-400 p-2">Remarks</th>
            </tr>
          </thead>
          <tbody>
            <GenderRows students={students} colSpan={3}>
              {(student, index) => {
                const computed = results[student.id].quarterly;
                const stored = studentData[student.id][fieldKey];
                const value = stored !== "" ? stored : (computed ?? "");
                const grade = numeric(value) ?? computed;
                return (
                  <tr key={student.id}>
                    <td className="border border-neutral-400 p-2 font-medium">
                      {index + 1}. {student.lastName}, {student.firstName}
                    </td>
                    <td className="border border-neutral-400 p-1 text-center">
                      <Input
                        type="number"
                        min="60"
                        max="100"
                        value={value}
                        disabled={readOnly}
                        placeholder={computed != null ? String(computed) : ""}
                        onChange={(e) =>
                          onScoreChange(
                            student.id,
                            fieldKey,
                            null,
                            e.target.value
                          )
                        }
                        className="mx-auto h-8 w-24 text-center"
                      />
                    </td>
                    <td
                      className={cn(
                        "border border-neutral-400 p-2 text-center font-semibold",
                        gradeToneClass(grade)
                      )}
                    >
                      {gradeRemark(grade).toUpperCase()}
                    </td>
                  </tr>
                );
              }}
            </GenderRows>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SummaryTab({ students, studentData, results, term = 1 }) {
  const fieldKey = termGradeFieldKey(term);
  const rows = students.map((student) => {
    const grade =
      numeric(studentData[student.id][fieldKey]) ??
      results[student.id].quarterly;
    return { student, grade };
  });
  const bands = [
    ["98–100", (g) => g >= 98],
    ["95–97", (g) => g >= 95 && g <= 97],
    ["90–94", (g) => g >= 90 && g <= 94],
    ["85–89", (g) => g >= 85 && g <= 89],
    ["80–84", (g) => g >= 80 && g <= 84],
    ["75–79", (g) => g >= 75 && g <= 79],
    ["Below 75", (g) => g != null && g < PASSING_GRADE],
  ];
  const withGrade = rows.filter((r) => r.grade != null);
  const passed = withGrade.filter((r) => r.grade >= PASSING_GRADE).length;
  const failed = withGrade.filter((r) => r.grade < PASSING_GRADE).length;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-[#800000]/10 bg-white p-5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <h2 className="font-heading text-lg font-bold text-[#3d1212]">
          Passed Summary
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Based on {termLabel(term)} grades for this workbook only.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold text-emerald-800 uppercase">
              Passed
            </p>
            <p className="text-2xl font-bold text-emerald-700">{passed}</p>
          </div>
          <div className="rounded-xl bg-rose-50 px-4 py-3">
            <p className="text-xs font-semibold text-rose-800 uppercase">
              Failed
            </p>
            <p className="text-2xl font-bold text-rose-700">{failed}</p>
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-[#800000]/10 bg-white p-5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <h2 className="mb-3 font-heading text-lg font-bold text-[#3d1212]">
          Grade bands
        </h2>
        <ul className="space-y-2 text-sm">
          {bands.map(([label, match]) => (
            <li
              key={label}
              className="flex items-center justify-between border-b border-[#800000]/08 py-1.5"
            >
              <span>{label}</span>
              <span className="font-semibold tabular-nums">
                {withGrade.filter((r) => match(r.grade)).length}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function AnalysisTab({ exam, metadata, students, studentData, hps }) {
  const labels = { s1: "SM1", s2: "SM2", te: "Term Exam" };
  const possible = numeric(hps);
  const scores = students
    .map((s) => numeric(studentData[s.id]?.exams?.[exam]))
    .filter((v) => v != null);
  const total = scores.reduce((a, b) => a + b, 0);
  const stats = [
    ["No. of Students", students.length],
    ["No. with Scores", scores.length],
    [
      "MPS",
      possible && scores.length
        ? `${displayNumber((total / (possible * scores.length)) * 100)}%`
        : "—",
    ],
    ["Highest Score", scores.length ? Math.max(...scores) : "—"],
    ["Lowest Score", scores.length ? Math.min(...scores) : "—"],
    ["Total Score", scores.length ? total : "—"],
  ];

  return (
    <div className="space-y-4">
      <RecordHeader metadata={metadata} />
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <div className="portal-panel-head flex items-center gap-2 px-4 py-3">
            <BarChart3 className="size-4 text-[#800000]" />
            <h2 className="font-heading font-bold text-[#3d1212]">
              {labels[exam]} Test Result Analysis
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#800000]/5 text-left text-[#3d1212]">
                <th className="px-3 py-2">Number</th>
                <th className="px-3 py-2">Learner</th>
                <th className="px-3 py-2 text-center">Score</th>
                <th className="px-3 py-2 text-center">Percentage Score (%)</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => {
                const score = numeric(studentData[student.id].exams[exam]);
                return (
                  <tr
                    key={student.id}
                    className="border-t border-[#800000]/08"
                  >
                    <td className="px-3 py-2 text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2 font-medium text-[#3d1212]">
                      {student.lastName}, {student.firstName}
                    </td>
                    <td className="px-3 py-2 text-center">{score ?? "—"}</td>
                    <td className="px-3 py-2 text-center">
                      {score != null && possible
                        ? `${displayNumber((score / possible) * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <div className="portal-panel-head px-4 py-3 text-sm font-bold text-[#3d1212]">
            Assessment Statistics
          </div>
          <table className="w-full text-xs">
            <tbody>
              {stats.map(([label, value]) => (
                <tr key={label} className="border-t border-[#800000]/08">
                  <td className="px-3 py-2 text-muted-foreground">{label}</td>
                  <td className="px-3 py-2 text-right font-bold text-[#800000]">
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
