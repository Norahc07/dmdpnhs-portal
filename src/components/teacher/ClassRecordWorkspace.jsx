"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  ChevronRight,
  Cloud,
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
} from "@/lib/class-record";
import {
  GRADE_WORKFLOW,
  canTeacherEditWorkflow,
} from "@/lib/grade-workflow";
import { gradeRemark, gradeToneClass, PASSING_GRADE } from "@/lib/grades-terms";
import { cn } from "@/lib/utils";

const WW_COUNT = 10;
const PT_COUNT = 10;
const EXAMS = ["s1", "s2", "te"];
const TABS = [
  ["input", "Input Data"],
  ["semester", "1st Semestral Grade"],
  ["final", "Term Grades"],
  ["summary", "Passed Summary"],
  ["s1", "SM1 Analysis"],
  ["s2", "SM2 Analysis"],
  ["te", "Term Exam Analysis"],
];

function blankArray(length, value = "") {
  return Array.from({ length }, () => value);
}

function createData(initialData, metadataDefaults, students) {
  const source = initialData || {};
  const existingStudents = source.students || {};
  const studentData = {};

  for (const student of students) {
    const saved = existingStudents[student.id] || {};
    const normalized = normalizeStudentRow(saved);
    // Prefer stored term1; otherwise leave blank so computed grade can fill the UI
    studentData[student.id] = normalized;
  }

  return {
    metadata: { ...metadataDefaults, ...(source.metadata || {}) },
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
  subjectId,
  initialWeights,
  metadataDefaults,
  initialData,
  students,
  isAdvisory,
  initialWorkflowStatus = GRADE_WORKFLOW.DRAFT,
  reviewNotes = null,
}) {
  const [record, setRecord] = useState(() =>
    createData(initialData, metadataDefaults, students)
  );
  const [weights, setWeights] = useState(() =>
    normalizeComponentWeights(initialWeights)
  );
  const [workflowStatus, setWorkflowStatus] = useState(
    initialWorkflowStatus || GRADE_WORKFLOW.DRAFT
  );
  const [saveState, setSaveState] = useState("idle");
  const [pending, startTransition] = useTransition();
  const mounted = useRef(false);
  const editable = canTeacherEditWorkflow(workflowStatus);

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

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return undefined;
    }
    if (!editable) return undefined;

    setSaveState("saving");
    const timer = setTimeout(() => {
      startTransition(async () => {
        const result = await saveClassRecord({ assignmentId, data: record });
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
  }, [assignmentId, record, editable]);

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
      } else if (group === "finalTerm" || group === "term1" || group === "term2") {
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

  function saveNow() {
    if (!editable) {
      toast.error("This class record cannot be edited in its current status.");
      return;
    }
    startTransition(async () => {
      setSaveState("saving");
      const result = await saveClassRecord({ assignmentId, data: record });
      if (result?.error) {
        setSaveState("error");
        toast.error(result.error);
      } else {
        setSaveState("saved");
        if (result?.data?.workflow_status) {
          setWorkflowStatus(result.data.workflow_status);
        }
        toast.success("Class record saved (draft).");
      }
    });
  }

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
            {record.metadata.subject}
          </span>
        </nav>
        <div className="flex items-center gap-2">
          {isAdvisory ? (
            <Badge className="bg-[#ffd700]/25 text-[#6a4d00] hover:bg-[#ffd700]/25">
              <ShieldCheck className="size-3" />
              Advisory section
            </Badge>
          ) : null}
          <SaveIndicator state={saveState} />
          <Button
            size="sm"
            onClick={saveNow}
            disabled={pending || !editable}
            className="bg-[#800000] hover:bg-[#6a0000]"
          >
            <Save className="size-3.5" />
            Save draft
          </Button>
        </div>
      </div>

      <Link
        href="/teacher/gradebook"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#800000] hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to class records
      </Link>

      <ClassRecordWorkflowBar
        assignmentId={assignmentId}
        initialStatus={workflowStatus}
        reviewNotes={reviewNotes}
        onStatusChange={setWorkflowStatus}
      />

      {subjectId && editable ? (
        <SubjectWeightsEditor
          subjectId={subjectId}
          subjectName={record.metadata.subject}
          initialWeights={weights}
          onSaved={setWeights}
        />
      ) : null}

      <Tabs defaultValue="input" className="gap-4">
        <div className="overflow-x-auto rounded-xl border border-[#800000]/10 bg-white p-1.5 shadow-sm">
          <TabsList className="h-auto min-w-max bg-transparent">
            {TABS.map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-9 px-3 data-active:bg-[#800000] data-active:text-white"
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
            onChange={updateMetadata}
          />
        </TabsContent>
        <TabsContent value="semester">
          <GradeSheet
            metadata={record.metadata}
            students={orderedStudents}
            studentData={record.students}
            hps={record.hps}
            results={results}
            weights={weights}
            readOnly={!editable}
            onHpsChange={editable ? updateHps : () => {}}
            onScoreChange={editable ? updateStudent : () => {}}
          />
        </TabsContent>
        <TabsContent value="final">
          <FinalGradesTab
            metadata={record.metadata}
            students={orderedStudents}
            studentData={record.students}
            results={results}
            onScoreChange={editable ? updateStudent : () => {}}
          />
        </TabsContent>
        <TabsContent value="summary">
          <SummaryTab
            students={orderedStudents}
            studentData={record.students}
            results={results}
          />
        </TabsContent>
        {EXAMS.map((exam) => (
          <TabsContent key={exam} value={exam}>
            <AnalysisTab
              exam={exam}
              metadata={record.metadata}
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

function SaveIndicator({ state }) {
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
            : "Autosave ready"}
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

function InputDataTab({ metadata, students, onChange }) {
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
      <section className="rounded-xl border border-[#800000]/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BookOpenCheck className="size-5 text-[#800000]" />
          <h2 className="font-heading text-lg font-bold text-[#3d1212]">
            Input Data for SHS/JHS E-Class Record
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([key, label]) => (
            <label key={key} className="space-y-1.5">
              <span className="text-xs font-semibold text-[#3d1212]">
                {label}
              </span>
              <Input
                value={metadata[key] || ""}
                onChange={(event) => onChange(key, event.target.value)}
                placeholder={`Enter ${label.toLowerCase()}`}
              />
            </label>
          ))}
        </div>
      </section>
      <LearnerRoster students={students} />
    </div>
  );
}

function LearnerRoster({ students }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#800000]/10 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-[#800000]" />
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
  onHpsChange,
  onScoreChange,
}) {
  const w = normalizeComponentWeights(weights);
  const tableCell = "border border-neutral-400 p-1 text-center text-[10px]";
  return (
    <section>
      <RecordHeader metadata={metadata} />
      {readOnly ? (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Read-only while awaiting validation or lock. Scores cannot be changed.
        </p>
      ) : null}
      <div className="overflow-auto border border-neutral-400 bg-white shadow-sm">
        <table className="min-w-425 border-collapse text-xs">
          <thead>
            <tr className="bg-neutral-100 font-bold">
              <th rowSpan={2} className={cn(tableCell, "sticky left-0 z-10 min-w-50 bg-neutral-100")}>
                LEARNERS&apos; NAMES
              </th>
              <th colSpan={13} className={tableCell}>WRITTEN WORKS ({w.written}%)</th>
              <th colSpan={13} className={tableCell}>PERFORMANCE TASKS ({w.performance}%)</th>
              <th colSpan={5} className={tableCell}>EXAMINATIONS ({w.assessment}%)</th>
              <th rowSpan={2} className={tableCell}>Initial Grade</th>
              <th rowSpan={2} className={tableCell}>Quarterly Grade</th>
            </tr>
            <tr className="bg-neutral-50">
              {blankArray(WW_COUNT).map((_, index) => <th key={`ww-${index}`} className={tableCell}>{index + 1}</th>)}
              {["Total", "PS", "WS"].map((label) => <th key={`ww-${label}`} className={tableCell}>{label}</th>)}
              {blankArray(PT_COUNT).map((_, index) => <th key={`pt-${index}`} className={tableCell}>{index + 1}</th>)}
              {["Total", "PS", "WS"].map((label) => <th key={`pt-${label}`} className={tableCell}>{label}</th>)}
              {["S1", "S2", "TE", "PS", "WS"].map((label) => <th key={label} className={tableCell}>{label}</th>)}
            </tr>
            <tr className="bg-amber-50">
              <th className={cn(tableCell, "sticky left-0 z-10 bg-amber-50 text-left")}>HIGHEST POSSIBLE SCORE</th>
              {hps.ww.map((value, index) => (
                <th key={`ww-hps-${index}`} className={tableCell}>
                  <Input type="number" min="0" value={value} disabled={readOnly} onChange={(e) => onHpsChange("ww", index, e.target.value)} className={scoreInputClass()} />
                </th>
              ))}
              <th className={tableCell}>{sum(hps.ww) || "—"}</th><th className={tableCell}>100</th><th className={tableCell}>{w.written}%</th>
              {hps.pt.map((value, index) => (
                <th key={`pt-hps-${index}`} className={tableCell}>
                  <Input type="number" min="0" value={value} disabled={readOnly} onChange={(e) => onHpsChange("pt", index, e.target.value)} className={scoreInputClass()} />
                </th>
              ))}
              <th className={tableCell}>{sum(hps.pt) || "—"}</th><th className={tableCell}>100</th><th className={tableCell}>{w.performance}%</th>
              {EXAMS.map((exam) => (
                <th key={`${exam}-hps`} className={tableCell}>
                  <Input type="number" min="0" value={hps.exams[exam]} disabled={readOnly} onChange={(e) => onHpsChange("exams", exam, e.target.value)} className={scoreInputClass()} />
                </th>
              ))}
              <th className={tableCell}>100</th><th className={tableCell}>{w.assessment}%</th><th className={tableCell} /><th className={tableCell} />
            </tr>
          </thead>
          <tbody>
            <GenderRows students={students} colSpan={34}>
              {(student, index) => {
                const row = studentData[student.id];
                const result = results[student.id];
                return (
                  <tr key={student.id}>
                    <td className={cn(tableCell, "sticky left-0 z-5 bg-white text-left font-medium")}>
                      {index + 1}. {student.lastName}, {student.firstName}
                    </td>
                    {row.ww.map((value, i) => <ScoreTd key={`ww-${i}`} value={value} disabled={readOnly} onChange={(v) => onScoreChange(student.id, "ww", i, v)} />)}
                    <ResultCells result={result.ww} />
                    {row.pt.map((value, i) => <ScoreTd key={`pt-${i}`} value={value} disabled={readOnly} onChange={(v) => onScoreChange(student.id, "pt", i, v)} />)}
                    <ResultCells result={result.pt} />
                    {EXAMS.map((exam) => <ScoreTd key={exam} value={row.exams[exam]} disabled={readOnly} onChange={(v) => onScoreChange(student.id, "exams", exam, v)} />)}
                    <td className={tableCell}>{displayNumber(result.exams.ps)}</td>
                    <td className={tableCell}>{displayNumber(result.exams.ws)}</td>
                    <td className={cn(tableCell, "font-semibold")}>{displayNumber(result.initial)}</td>
                    <td className={cn(tableCell, "font-bold text-[#800000]")}>{displayNumber(result.quarterly, 0)}</td>
                  </tr>
                );
              }}
            </GenderRows>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Enter the highest possible scores first. PS, weighted scores, initial
        grades, and transmuted quarterly grades calculate automatically.
      </p>
    </section>
  );
}

function ScoreTd({ value, onChange, disabled = false }) {
  return (
    <td className="border border-neutral-400 p-0">
      <Input
        type="number"
        min="0"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={scoreInputClass()}
      />
    </td>
  );
}

function ResultCells({ result }) {
  return (
    <>
      <td className="border border-neutral-400 p-1 text-center text-[10px]">{displayNumber(result.total)}</td>
      <td className="border border-neutral-400 p-1 text-center text-[10px]">{displayNumber(result.ps)}</td>
      <td className="border border-neutral-400 p-1 text-center text-[10px]">{displayNumber(result.ws)}</td>
    </>
  );
}

function FinalGradesTab({ metadata, students, studentData, results, onScoreChange }) {
  return (
    <section>
      <RecordHeader metadata={metadata} />
      <div className="overflow-auto border border-neutral-400 bg-white">
        <table className="w-full min-w-200 border-collapse text-sm">
          <thead className="bg-neutral-100">
            <tr>
              <th className="border border-neutral-400 p-2 text-left">LEARNERS&apos; NAMES</th>
              <th className="border border-neutral-400 p-2">1st Term</th>
              <th className="border border-neutral-400 p-2">2nd Term</th>
              <th className="border border-neutral-400 p-2">Final Term</th>
              <th className="border border-neutral-400 p-2">Remarks</th>
            </tr>
          </thead>
          <tbody>
            <GenderRows students={students} colSpan={5}>
              {(student, index) => {
                const computed = results[student.id].quarterly;
                const term1Value =
                  studentData[student.id].term1 !== ""
                    ? studentData[student.id].term1
                    : computed ?? "";
                const term1 = numeric(term1Value);
                const term2 = numeric(studentData[student.id].term2);
                const final = numeric(studentData[student.id].finalTerm);
                const remarkGrade = final ?? term2 ?? term1;
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
                        value={term1Value}
                        placeholder={computed != null ? String(computed) : ""}
                        onChange={(e) =>
                          onScoreChange(student.id, "term1", null, e.target.value)
                        }
                        className="mx-auto h-8 w-24 text-center"
                      />
                    </td>
                    <td className="border border-neutral-400 p-1 text-center">
                      <Input
                        type="number"
                        min="60"
                        max="100"
                        value={studentData[student.id].term2}
                        onChange={(e) =>
                          onScoreChange(student.id, "term2", null, e.target.value)
                        }
                        className="mx-auto h-8 w-24 text-center"
                      />
                    </td>
                    <td className="border border-neutral-400 p-1 text-center">
                      <Input
                        type="number"
                        min="60"
                        max="100"
                        value={studentData[student.id].finalTerm}
                        onChange={(e) =>
                          onScoreChange(student.id, "finalTerm", null, e.target.value)
                        }
                        className="mx-auto h-8 w-24 text-center"
                      />
                    </td>
                    <td
                      className={cn(
                        "border border-neutral-400 p-2 text-center font-semibold",
                        gradeToneClass(remarkGrade)
                      )}
                    >
                      {gradeRemark(remarkGrade).toUpperCase()}
                    </td>
                  </tr>
                );
              }}
            </GenderRows>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        1st Term defaults from the computed semestral grade when left blank. Saving
        publishes all filled terms to the student and parent grade portals for{" "}
        {metadata.schoolYear || "this school year"}.
      </p>
    </section>
  );
}

function SummaryTab({ students, studentData, results }) {
  const rows = students.map((student) => {
    const term1 =
      numeric(studentData[student.id].term1) ?? results[student.id].quarterly;
    const term2 = numeric(studentData[student.id].term2);
    const finalTerm = numeric(studentData[student.id].finalTerm);
    const grade = finalTerm ?? term2 ?? term1;
    return { student, grade };
  });
  const bands = [
    ["98–100", (g) => g >= 98],
    ["95–97", (g) => g >= 95 && g <= 97],
    ["90–94", (g) => g >= 90 && g <= 94],
    ["85–89", (g) => g >= 85 && g <= 89],
    ["80–84", (g) => g >= 80 && g <= 84],
    ["75–79", (g) => g >= 75 && g <= 79],
    ["Below 75", (g) => g < 75],
  ];
  const passed = rows.filter((row) => row.grade != null && row.grade >= PASSING_GRADE).length;
  const atRisk = rows.filter((row) => row.grade == null || row.grade < PASSING_GRADE).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total students passed" value={passed} tone="green" />
        <MetricCard label="Section count" value={students.length} />
        <MetricCard label="Did not meet expectations" value={rows.filter((r) => r.grade != null && r.grade < PASSING_GRADE).length} tone="red" />
        <MetricCard label="At risk of failing" value={atRisk} tone="amber" />
      </div>
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="font-heading font-bold text-[#3d1212]">Grade distribution</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#800000]/5 text-left">
            <tr><th className="px-4 py-2">Performance level</th><th className="px-4 py-2">Grade range</th><th className="px-4 py-2 text-right">Learners</th></tr>
          </thead>
          <tbody>
            {bands.map(([range, test], index) => {
              const labels = ["Outstanding", "Outstanding", "Outstanding", "Very Satisfactory", "Satisfactory", "Fairly Satisfactory", "Did Not Meet Expectations"];
              return (
                <tr key={range} className="border-t">
                  <td className="px-4 py-2 font-medium">{labels[index]}</td>
                  <td className="px-4 py-2 text-muted-foreground">{range}</td>
                  <td className="px-4 py-2 text-right font-bold text-[#800000]">{rows.filter((row) => row.grade != null && test(row.grade)).length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone = "maroon" }) {
  const tones = {
    maroon: "bg-[#800000]/8 text-[#800000]",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <span className={cn("flex size-9 items-center justify-center rounded-lg", tones[tone])}>
        <BarChart3 className="size-4.5" />
      </span>
      <p className="mt-3 text-2xl font-bold text-[#3d1212]">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function AnalysisTab({ exam, metadata, students, studentData, hps }) {
  const labels = { s1: "Summative 1 (SM1)", s2: "Summative 2 (SM2)", te: "Term Examination" };
  const possible = numeric(hps) || 0;
  const scores = students.map((student) => numeric(studentData[student.id].exams[exam])).filter((score) => score != null);
  const sorted = [...scores].sort((a, b) => a - b);
  const total = sum(scores);
  const mean = scores.length ? total / scores.length : null;
  const median = !sorted.length ? null : sorted.length % 2 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const sd = scores.length ? Math.sqrt(scores.reduce((acc, score) => acc + (score - mean) ** 2, 0) / scores.length) : null;
  const above = possible ? scores.filter((score) => (score / possible) * 100 >= 75).length : 0;
  const below = scores.length - above;
  const stats = [
    ["Number of Examinees", scores.length],
    ["Highest Possible Score", possible || "—"],
    ["Got 75% & above", above],
    ["Percentage (75% & above)", scores.length ? `${displayNumber((above / scores.length) * 100)}%` : "—"],
    ["Got below 75%", below],
    ["Percentage (below 75%)", scores.length ? `${displayNumber((below / scores.length) * 100)}%` : "—"],
    ["Mean", displayNumber(mean)],
    ["Median", displayNumber(median)],
    ["Standard Deviation", displayNumber(sd)],
    ["MPS", possible && scores.length ? `${displayNumber((total / (possible * scores.length)) * 100)}%` : "—"],
    ["Highest Score", scores.length ? Math.max(...scores) : "—"],
    ["Lowest Score", scores.length ? Math.min(...scores) : "—"],
    ["Total Score", scores.length ? total : "—"],
  ];

  return (
    <div className="space-y-4">
      <RecordHeader metadata={metadata} />
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b bg-[#800000]/5 px-4 py-3">
            <h2 className="font-heading font-bold text-[#3d1212]">{labels[exam]} Test Result Analysis</h2>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-neutral-100 text-left"><th className="px-3 py-2">Number</th><th className="px-3 py-2">Learner</th><th className="px-3 py-2 text-center">Score</th><th className="px-3 py-2 text-center">Percentage Score (%)</th></tr></thead>
            <tbody>
              {students.map((student, index) => {
                const score = numeric(studentData[student.id].exams[exam]);
                return (
                  <tr key={student.id} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                    <td className="px-3 py-2 font-medium">{student.lastName}, {student.firstName}</td>
                    <td className="px-3 py-2 text-center">{score ?? "—"}</td>
                    <td className="px-3 py-2 text-center">{score != null && possible ? `${displayNumber((score / possible) * 100)}%` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b bg-[#800000] px-4 py-3 text-sm font-bold text-white">Assessment Statistics</div>
          <table className="w-full text-xs">
            <tbody>
              {stats.map(([label, value], index) => (
                <tr key={label} className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">
                    {index === 2 ? <strong className="text-[#3d1212]">Criteria-Referenced · </strong> : null}
                    {index === 6 ? <strong className="text-[#3d1212]">Norm-Referenced · </strong> : null}
                    {index === 10 ? <strong className="text-[#3d1212]">Other Info · </strong> : null}
                    {label}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-[#800000]">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
