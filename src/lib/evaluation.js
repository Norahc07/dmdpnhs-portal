import { GRADE_TERMS } from "@/lib/grades-terms";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";

/** Teachers submit year-end evaluations once (stored as Final Term = 3). */
export const TEACHER_YEAR_END_TERM = 3;

export const EVALUATION_SCALE = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Fair" },
  { value: 3, label: "Good" },
  { value: 4, label: "Very good" },
  { value: 5, label: "Excellent" },
];

export const STUDENT_SYSTEM_QUESTIONS = [
  {
    id: "access",
    prompt: "I can easily access grades, attendance, and school info in PastraPortal.",
  },
  {
    id: "process",
    prompt: "Digital processes (activation, documents, viewing records) are clearer than paper-only steps.",
  },
  {
    id: "distribution",
    prompt: "Getting grade and attendance updates through the portal is timely and helpful.",
  },
  {
    id: "usability",
    prompt: "The student portal is easy to use on my device.",
  },
  {
    id: "overall",
    prompt: "Overall, PastraPortal helps me as a learner.",
  },
];

export const STUDENT_TEACHER_QUESTIONS = [
  {
    id: "teaching",
    prompt: "The teacher explains lessons clearly and helps me learn.",
  },
  {
    id: "fairness",
    prompt: "Grading and classroom expectations feel fair.",
  },
  {
    id: "engagement",
    prompt: "The teacher encourages participation and supports struggling learners.",
  },
  {
    id: "communication",
    prompt: "The teacher communicates requirements and feedback effectively.",
  },
  {
    id: "overall",
    prompt: "Overall teaching performance this term.",
  },
];

export const TEACHER_SYSTEM_QUESTIONS = [
  {
    id: "attendance",
    prompt: "Recording attendance digitally is faster and more reliable than paper.",
  },
  {
    id: "class_record",
    prompt: "The class record / gradebook helps me encode and manage scores efficiently.",
  },
  {
    id: "distribution",
    prompt: "Locking and distributing grades through the portal is clear and useful.",
  },
  {
    id: "sections",
    prompt: "Managing my assigned section(s) (rosters, loads) is easier in the portal.",
  },
  {
    id: "overall",
    prompt: "Overall, PastraPortal supports my daily teaching work this school year.",
  },
];

export const TEACHER_SECTION_QUESTIONS = [
  {
    id: "roster",
    prompt: "I can manage this section’s roster and daily class needs through the portal.",
  },
  {
    id: "attendance_flow",
    prompt: "Attendance for this section is practical to encode and review digitally.",
  },
  {
    id: "grading_flow",
    prompt: "Class records and grade distribution for this section work well for me.",
  },
  {
    id: "workload",
    prompt: "The portal reduces paperwork for handling this section.",
  },
  {
    id: "overall",
    prompt: "Overall digital support for this section this school year.",
  },
];

export const PARENT_SYSTEM_QUESTIONS = [
  {
    id: "grades_access",
    prompt: "I can view my child’s grades clearly in the parent portal.",
  },
  {
    id: "attendance_access",
    prompt: "I can monitor my child’s attendance easily.",
  },
  {
    id: "sms",
    prompt: "SMS / portal notices (when sent) help me stay informed.",
  },
  {
    id: "usability",
    prompt: "Signing in with my Parent Access Code and using the portal is easy.",
  },
  {
    id: "overall",
    prompt: "Overall, PastraPortal helps me as a parent.",
  },
];

/** Parent rates experience supporting / observing each linked child */
export const PARENT_CHILD_QUESTIONS = [
  {
    id: "progress_visibility",
    prompt: "I can understand this child’s academic progress through the portal.",
  },
  {
    id: "attendance_visibility",
    prompt: "I can follow this child’s attendance and absences clearly.",
  },
  {
    id: "support",
    prompt: "Portal information helps me support this child’s learning at home.",
  },
  {
    id: "communication",
    prompt: "I feel informed about this child’s school standing via the portal.",
  },
  {
    id: "overall",
    prompt: "Overall portal usefulness for monitoring this child.",
  },
];

export function questionsFor(role, evaluationType) {
  if (evaluationType === "teacher") return STUDENT_TEACHER_QUESTIONS;
  if (evaluationType === "section") return TEACHER_SECTION_QUESTIONS;
  if (evaluationType === "child") return PARENT_CHILD_QUESTIONS;
  if (role === "teacher") return TEACHER_SYSTEM_QUESTIONS;
  if (role === "parent") return PARENT_SYSTEM_QUESTIONS;
  return STUDENT_SYSTEM_QUESTIONS;
}

export function averageFromScores(scores, questions) {
  const vals = questions
    .map((q) => Number(scores?.[q.id]))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
  if (!vals.length) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(avg * 100) / 100;
}

export function currentEvaluationTerm() {
  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 9) return 1;
  if (month >= 10 || month <= 1) return 2;
  return 3;
}

export function evaluationTermOptions(schoolYear = SCHOOL_YEAR_DEFAULT) {
  return GRADE_TERMS.map((t) => ({
    value: String(t.value),
    label: `${t.label} · SY ${schoolYear}`,
    term: t.value,
  }));
}

/**
 * Student must finish system + every assigned teacher for the term
 * before official grades for that term unlock.
 */
export function computeStudentTermCompletion({
  teachers = [],
  evaluations = [],
  term,
  schoolYear,
}) {
  const inTerm = evaluations.filter(
    (e) =>
      e.school_year === schoolYear && Number(e.term) === Number(term)
  );
  const systemDone = inTerm.some((e) => e.evaluation_type === "system");
  const teacherDoneKeys = new Set(
    inTerm
      .filter((e) => e.evaluation_type === "teacher")
      .map((e) => `${e.target_teacher_id}::${e.target_subject_id}`)
  );
  const teacherItems = teachers.map((t) => {
    const key = `${t.teacherId}::${t.subjectId}`;
    return {
      ...t,
      key,
      done: teacherDoneKeys.has(key),
    };
  });
  const teachersDone =
    teacherItems.length === 0 || teacherItems.every((t) => t.done);
  const requiredTeacherCount = teacherItems.length;
  const completedTeacherCount = teacherItems.filter((t) => t.done).length;
  // Complete only when system is done AND every listed subject teacher is rated.
  const complete = systemDone && teachersDone;

  return {
    systemDone,
    teachers: teacherItems,
    requiredTeacherCount,
    completedTeacherCount,
    teachersDone: teacherItems.length > 0 && teacherItems.every((t) => t.done),
    complete,
    totalRequired: 1 + requiredTeacherCount,
    totalCompleted: (systemDone ? 1 : 0) + completedTeacherCount,
    awaitingTeachers: requiredTeacherCount === 0,
  };
}

/** Teacher year-end: system + each unique section */
export function computeTeacherYearCompletion({
  sections = [],
  evaluations = [],
  schoolYear,
}) {
  const term = TEACHER_YEAR_END_TERM;
  const inYear = evaluations.filter(
    (e) =>
      e.school_year === schoolYear && Number(e.term) === term
  );
  const systemDone = inYear.some((e) => e.evaluation_type === "system");

  // Unique sections
  const uniqueSections = [];
  const seen = new Set();
  for (const s of sections) {
    if (!s.sectionId || seen.has(s.sectionId)) continue;
    seen.add(s.sectionId);
    uniqueSections.push(s);
  }

  const sectionDoneIds = new Set(
    inYear
      .filter((e) => e.evaluation_type === "section")
      .map((e) => e.target_section_id)
  );
  const sectionItems = uniqueSections.map((s) => ({
    ...s,
    done: sectionDoneIds.has(s.sectionId),
  }));
  const sectionsDone = sectionItems.every((s) => s.done);
  const complete = systemDone && (sectionItems.length === 0 || sectionsDone);

  return {
    systemDone,
    sections: sectionItems,
    complete,
    totalRequired: 1 + sectionItems.length,
    totalCompleted:
      (systemDone ? 1 : 0) + sectionItems.filter((s) => s.done).length,
    term,
  };
}

/** Parent: system + each linked child */
export function computeParentTermCompletion({
  children = [],
  evaluations = [],
  term,
  schoolYear,
}) {
  const inTerm = evaluations.filter(
    (e) =>
      e.school_year === schoolYear && Number(e.term) === Number(term)
  );
  const systemDone = inTerm.some((e) => e.evaluation_type === "system");
  const childDoneIds = new Set(
    inTerm
      .filter((e) => e.evaluation_type === "child")
      .map((e) => e.student_id)
  );
  const childItems = children.map((c) => ({
    ...c,
    done: childDoneIds.has(c.id),
    name: [c.profiles?.last_name, c.profiles?.first_name]
      .filter(Boolean)
      .join(", "),
  }));
  const childrenDone = childItems.every((c) => c.done);
  const complete = systemDone && (childItems.length === 0 || childrenDone);

  return {
    systemDone,
    children: childItems,
    complete,
    totalRequired: 1 + childItems.length,
    totalCompleted:
      (systemDone ? 1 : 0) + childItems.filter((c) => c.done).length,
  };
}
