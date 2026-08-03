"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { submitEvaluation } from "@/actions/evaluation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EVALUATION_SCALE,
  TEACHER_YEAR_END_TERM,
  evaluationTermOptions,
  questionsFor,
} from "@/lib/evaluation";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import { cn } from "@/lib/utils";

function ScorePicker({ name, value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {EVALUATION_SCALE.map((s) => {
        const active = Number(value) === s.value;
        return (
          <button
            key={s.value}
            type="button"
            disabled={disabled}
            title={s.label}
            onClick={() => onChange(s.value)}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-lg border text-sm font-semibold transition",
              active
                ? "border-[#800000]/20 bg-[#800000]/10 text-[#800000] ring-1 ring-[#800000]/12"
                : "border-[#800000]/15 bg-white text-[#3d1212] hover:border-[#800000]/30 hover:bg-[#800000]/6"
            )}
            aria-label={`${name}: ${s.label}`}
          >
            {s.value}
          </button>
        );
      })}
    </div>
  );
}

function EvaluationGuide({ role, evaluationType, description }) {
  const purpose =
    evaluationType === "teacher"
      ? "Rate each subject teacher honestly so the school can improve teaching quality and classroom support for every learner."
      : evaluationType === "section"
        ? "Reflect on how the portal supports the sections you handle this school year."
        : evaluationType === "child"
          ? "Share how clearly you can monitor this child’s progress and attendance through the parent portal."
          : role === "teacher"
            ? "Help improve PastraPortal tools used for attendance, class records, and grade distribution."
            : role === "parent"
              ? "Tell us how the parent portal helps you stay informed about your child’s school standing."
              : "Help improve PastraPortal — grades access, digital processes, and how useful the student portal is for you.";

  return (
    <aside className="rounded-2xl border border-[#800000]/10 bg-linear-to-br from-[#faf7f5] to-white p-4 sm:p-5">
      <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
        How to evaluate
      </p>
      <h3 className="mt-1.5 font-heading text-base font-bold text-[#3d1212]">
        Purpose
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-[#3d1212]/85">
        {description || purpose}
      </p>

      <div className="mt-5">
        <h4 className="text-xs font-semibold tracking-wide text-[#800000] uppercase">
          Rating scale
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose one score for each question.
        </p>
        <ul className="mt-3 space-y-2">
          {EVALUATION_SCALE.map((s) => (
            <li
              key={s.value}
              className="flex items-center gap-2.5 rounded-xl border border-[#800000]/08 bg-white px-3 py-2"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#800000]/10 text-sm font-bold text-[#800000]">
                {s.value}
              </span>
              <span className="text-sm font-medium text-[#3d1212]">
                {s.label}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          1 = Poor · 5 = Excellent. Your responses are used for school improvement
          and are not a personal grade.
        </p>
      </div>
    </aside>
  );
}

export function EvaluationFormPanel({
  role,
  evaluationType = "system",
  schoolYear = SCHOOL_YEAR_DEFAULT,
  defaultTerm = 1,
  teachers = [],
  sections = [],
  children = [],
  existing = null,
  title,
  description,
  yearOnly = false,
  hideTargetPickers = false,
  lockedTeacherKey = "",
  lockedSectionId = "",
  lockedChildId = "",
  onTeacherKeyChange,
  onSectionChange,
  onChildChange,
  onSubmitted,
}) {
  const router = useRouter();
  const questions = useMemo(
    () => questionsFor(role, evaluationType),
    [role, evaluationType]
  );
  const termItems = useMemo(
    () => evaluationTermOptions(schoolYear),
    [schoolYear]
  );

  const [term, setTerm] = useState(
    String(yearOnly ? TEACHER_YEAR_END_TERM : defaultTerm)
  );
  const [teacherKey, setTeacherKey] = useState(() => {
    if (lockedTeacherKey) return lockedTeacherKey;
    if (existing?.target_teacher_id && existing?.target_subject_id) {
      return `${existing.target_teacher_id}::${existing.target_subject_id}`;
    }
    return teachers[0]
      ? `${teachers[0].teacherId}::${teachers[0].subjectId}`
      : "";
  });
  const [sectionId, setSectionId] = useState(
    () =>
      lockedSectionId ||
      existing?.target_section_id ||
      sections[0]?.sectionId ||
      ""
  );
  const [childId, setChildId] = useState(
    () => lockedChildId || existing?.student_id || children[0]?.id || ""
  );
  const [scores, setScores] = useState(() => {
    const init = {};
    for (const q of questions) {
      init[q.id] = existing?.scores?.[q.id] || "";
    }
    return init;
  });
  const [comments, setComments] = useState(existing?.comments || "");
  const [pending, startTransition] = useTransition();

  const teacherItems = teachers.map((t) => ({
    value: `${t.teacherId}::${t.subjectId}`,
    label: `${t.subjectName} — ${t.teacherName || "Teacher"}`,
  }));
  const sectionItems = sections.map((s) => ({
    value: s.sectionId,
    label: `Grade ${s.gradeLevel} · ${s.sectionName}`,
  }));
  const childItems = children.map((c) => ({
    value: c.id,
    label:
      [c.profiles?.last_name, c.profiles?.first_name].filter(Boolean).join(", ") ||
      c.lrn ||
      "Learner",
  }));

  const selectedTeacher = teachers.find(
    (t) => `${t.teacherId}::${t.subjectId}` === teacherKey
  );

  function submit() {
    startTransition(async () => {
      let targetTeacherId;
      let targetSubjectId;
      let targetSectionId;
      let targetStudentId;

      if (evaluationType === "teacher") {
        const [tid, sid] = String(teacherKey || lockedTeacherKey).split("::");
        targetTeacherId = tid;
        targetSubjectId = sid;
        if (!tid || !sid) {
          toast.error("Select a teacher to evaluate.");
          return;
        }
      }
      if (evaluationType === "section") {
        targetSectionId = sectionId || lockedSectionId;
        if (!targetSectionId) {
          toast.error("Select a section to evaluate.");
          return;
        }
      }
      if (evaluationType === "child") {
        targetStudentId = childId || lockedChildId;
        if (!targetStudentId) {
          toast.error("Select a child to evaluate.");
          return;
        }
      }

      const result = await submitEvaluation({
        evaluationType,
        term: Number(term),
        schoolYear,
        scores,
        comments,
        targetTeacherId,
        targetSubjectId,
        targetSectionId,
        targetStudentId,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.average
          ? `Saved (average ${result.average} / 5)`
          : "Evaluation saved"
      );
      router.refresh();
      onSubmitted?.();
    });
  }

  const icon =
    evaluationType === "teacher" || evaluationType === "child" ? (
      <Star className="size-5" />
    ) : evaluationType === "section" ? (
      <Users className="size-5" />
    ) : (
      <ClipboardCheck className="size-5" />
    );

  const showTeacherSelect =
    evaluationType === "teacher" && !hideTargetPickers && !lockedTeacherKey;
  const showSectionSelect =
    evaluationType === "section" && !hideTargetPickers && !lockedSectionId;
  const showChildSelect =
    evaluationType === "child" && !hideTargetPickers && !lockedChildId;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <div className="portal-panel-head flex items-start gap-3 px-4 py-4 sm:px-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000] ring-1 ring-[#800000]/12">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-base font-bold text-[#3d1212]">
            {title}
          </h2>
          {evaluationType === "teacher" && selectedTeacher ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {selectedTeacher.subjectName}
              {selectedTeacher.teacherName
                ? ` · ${selectedTeacher.teacherName}`
                : ""}
            </p>
          ) : description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
          {existing?.average_score != null ? (
            <Badge
              variant="outline"
              className="mt-2 border-emerald-200 bg-emerald-50 text-emerald-800"
            >
              Last avg {existing.average_score} / 5
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(240px,0.9fr)_1.4fr] lg:gap-5 sm:p-5">
        <EvaluationGuide
          role={role}
          evaluationType={evaluationType}
          description={description}
        />

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {yearOnly ? (
              <div className="rounded-xl border border-[#800000]/10 bg-[#faf7f5] px-3 py-2 text-sm sm:col-span-2">
                <p className="text-xs font-semibold text-[#800000] uppercase">
                  School year evaluation
                </p>
                <p className="mt-0.5 font-medium text-[#3d1212]">SY {schoolYear}</p>
                <p className="text-[11px] text-muted-foreground">
                  Required once at year-end for system + each section you handle.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Term</Label>
                <Select value={term} onValueChange={setTerm} items={termItems}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {termItems.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showTeacherSelect ? (
              <div className="space-y-1.5">
                <Label>Teacher / subject</Label>
                <Select
                  value={teacherKey}
                  onValueChange={(v) => {
                    setTeacherKey(v);
                    onTeacherKeyChange?.(v);
                  }}
                  items={teacherItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherItems.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {showSectionSelect ? (
              <div className="space-y-1.5">
                <Label>Section handled</Label>
                <Select
                  value={sectionId}
                  onValueChange={(v) => {
                    setSectionId(v);
                    onSectionChange?.(v);
                  }}
                  items={sectionItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectionItems.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {showChildSelect ? (
              <div className="space-y-1.5">
                <Label>Child</Label>
                <Select
                  value={childId}
                  onValueChange={(v) => {
                    setChildId(v);
                    onChildChange?.(v);
                  }}
                  items={childItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select child" />
                  </SelectTrigger>
                  <SelectContent>
                    {childItems.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {evaluationType === "system" && !yearOnly ? (
              <div className="flex items-end">
                <p className="text-xs text-muted-foreground">
                  School year{" "}
                  <span className="font-medium text-[#3d1212]">{schoolYear}</span>
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-[#800000] uppercase">
              Questions
            </p>
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-xl border border-[#800000]/10 bg-[#faf7f5] p-3.5"
              >
                <p className="text-sm font-medium text-[#3d1212]">
                  <span className="mr-1.5 text-xs font-bold text-[#800000]">
                    {idx + 1}.
                  </span>
                  {q.prompt}
                </p>
                <div className="mt-2.5">
                  <ScorePicker
                    name={q.id}
                    value={scores[q.id]}
                    disabled={pending}
                    onChange={(v) =>
                      setScores((prev) => ({
                        ...prev,
                        [q.id]: v,
                      }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`comments-${evaluationType}`}>
              Comments (optional)
            </Label>
            <Textarea
              id={`comments-${evaluationType}`}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Share a short note…"
              rows={3}
            />
          </div>

          <Button
            type="button"
            disabled={pending}
            className="bg-[#800000] text-white hover:bg-[#6a0000]"
            onClick={submit}
          >
            {pending ? "Saving…" : "Submit evaluation"}
          </Button>
        </div>
      </div>
    </div>
  );
}
