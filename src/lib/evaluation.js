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

export const STUDENT_SELF_QUESTIONS = [
  {
    id: "effort",
    prompt: "I put consistent effort into my lessons, tasks, and study time this term.",
  },
  {
    id: "attendance_habit",
    prompt: "I attend class on time and take responsibility for missed work.",
  },
  {
    id: "participation",
    prompt: "I participate in class and ask for help when I do not understand.",
  },
  {
    id: "honesty",
    prompt: "I complete my own work honestly and follow classroom rules.",
  },
  {
    id: "overall",
    prompt: "Overall, I am satisfied with my performance as a learner this term.",
  },
];

export const TEACHER_STUDENT_QUESTIONS = [
  {
    id: "engagement",
    prompt: "This learner participates and stays engaged during class.",
  },
  {
    id: "work_quality",
    prompt: "This learner submits work that meets the expected quality for the term.",
  },
  {
    id: "conduct",
    prompt: "This learner shows respect, honesty, and good classroom conduct.",
  },
  {
    id: "progress",
    prompt: "This learner is making academic progress relative to the subject requirements.",
  },
  {
    id: "overall",
    prompt: "Overall rating of this learner for this school year.",
  },
];

export function questionsFor(role, evaluationType) {
  if (evaluationType === "teacher") return STUDENT_TEACHER_QUESTIONS;
  if (evaluationType === "section") return TEACHER_SECTION_QUESTIONS;
  if (evaluationType === "self") return STUDENT_SELF_QUESTIONS;
  if (evaluationType === "student") return TEACHER_STUDENT_QUESTIONS;
  if (role === "teacher") return TEACHER_SYSTEM_QUESTIONS;
  return STUDENT_SYSTEM_QUESTIONS;
}

export function evaluationTypeLabel(type) {
  if (type === "system") return "System / portal";
  if (type === "teacher") return "Subject teacher";
  if (type === "section") return "Section";
  if (type === "self") return "Self-assessment";
  if (type === "student") return "Learner evaluation";
  return "Evaluation";
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
 * Student must finish system, self-assessment, and every assigned teacher
 * for the term before official grades for that term unlock.
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
  const selfDone = inTerm.some((e) => e.evaluation_type === "self");
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
  // Complete when system, self-assessment, and every listed subject teacher are done.
  const complete = systemDone && selfDone && teachersDone;

  return {
    systemDone,
    selfDone,
    teachers: teacherItems,
    requiredTeacherCount,
    completedTeacherCount,
    teachersDone: teacherItems.length > 0 && teacherItems.every((t) => t.done),
    complete,
    totalRequired: 2 + requiredTeacherCount,
    totalCompleted:
      (systemDone ? 1 : 0) + (selfDone ? 1 : 0) + completedTeacherCount,
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

export function computeTeacherStudentProgress({
  learners = [],
  evaluations = [],
  schoolYear,
}) {
  const term = TEACHER_YEAR_END_TERM;
  const inYear = evaluations.filter(
    (e) =>
      e.school_year === schoolYear &&
      Number(e.term) === term &&
      e.evaluation_type === "student"
  );
  const doneIds = new Set(inYear.map((e) => e.student_id));
  const items = learners.map((learner) => ({
    ...learner,
    done: doneIds.has(learner.studentId),
  }));
  return {
    learners: items,
    complete: items.length === 0 || items.every((item) => item.done),
    totalRequired: items.length,
    totalCompleted: items.filter((item) => item.done).length,
    term,
  };
}
