import { transmuteGrade } from "@/lib/deped-grades";
import { PASSING_GRADE } from "@/lib/grades-terms";

const WW_COUNT = 10;
const PT_COUNT = 10;
const EXAMS = ["s1", "s2", "te"];

export { EXAMS };

export const DEFAULT_COMPONENT_WEIGHTS = {
  written: 40,
  performance: 40,
  assessment: 20,
};

function blankArray(length, value = "") {
  return Array.from({ length }, () => value);
}

export function numeric(value) {
  if (value === "" || value == null || Number.isNaN(Number(value))) return null;
  return Number(value);
}

function sum(values) {
  return values.reduce((total, value) => total + (numeric(value) ?? 0), 0);
}

/**
 * Normalize WW / PT / Exam component weights from a subject row or partial object.
 * Assessment is the Examinations component in the class record.
 */
export function normalizeComponentWeights(source = {}) {
  const written = Number(
    source.written ??
      source.writtenWeight ??
      source.written_weight ??
      DEFAULT_COMPONENT_WEIGHTS.written
  );
  const performance = Number(
    source.performance ??
      source.performanceWeight ??
      source.performance_weight ??
      DEFAULT_COMPONENT_WEIGHTS.performance
  );
  const assessment = Number(
    source.assessment ??
      source.assessmentWeight ??
      source.assessment_weight ??
      source.exam ??
      source.examWeight ??
      DEFAULT_COMPONENT_WEIGHTS.assessment
  );

  return {
    written: Number.isFinite(written)
      ? written
      : DEFAULT_COMPONENT_WEIGHTS.written,
    performance: Number.isFinite(performance)
      ? performance
      : DEFAULT_COMPONENT_WEIGHTS.performance,
    assessment: Number.isFinite(assessment)
      ? assessment
      : DEFAULT_COMPONENT_WEIGHTS.assessment,
  };
}

export function weightsTotal(weights) {
  const w = normalizeComponentWeights(weights);
  return w.written + w.performance + w.assessment;
}

function componentResult(scores, hps, weight) {
  const scoreTotal = sum(scores);
  const hpsTotal = sum(hps);
  const ps = hpsTotal > 0 ? (scoreTotal / hpsTotal) * 100 : null;
  return {
    total: scoreTotal,
    ps,
    ws: ps == null ? null : (ps * weight) / 100,
    weight,
  };
}

export function gradeResult(row, hps, weightsInput) {
  const weights = normalizeComponentWeights(weightsInput);
  const ww = componentResult(row.ww, hps.ww, weights.written);
  const pt = componentResult(row.pt, hps.pt, weights.performance);
  const examScores = EXAMS.map((key) => row.exams[key]);
  const examHps = EXAMS.map((key) => hps.exams[key]);
  const exams = componentResult(examScores, examHps, weights.assessment);
  const ready = ww.ps != null && pt.ps != null && exams.ps != null;
  const initial = ready ? ww.ws + pt.ws + exams.ws : null;
  return {
    ww,
    pt,
    exams,
    weights,
    initial,
    quarterly: initial == null ? null : transmuteGrade(initial),
  };
}

export function normalizeStudentRow(saved = {}) {
  return {
    ww: [...(saved.ww || []), ...blankArray(WW_COUNT)].slice(0, WW_COUNT),
    pt: [...(saved.pt || []), ...blankArray(PT_COUNT)].slice(0, PT_COUNT),
    exams: { s1: "", s2: "", te: "", ...(saved.exams || {}) },
    term1: saved.term1 ?? "",
    term2: saved.term2 ?? "",
    finalTerm: saved.finalTerm ?? "",
  };
}

/**
 * Resolve published term grades for a student from class-record data.
 * Term 1 falls back to the computed semestral/quarterly grade when blank.
 */
export function resolveTermGrades(studentRow, hps, weightsInput) {
  const row = normalizeStudentRow(studentRow);
  const computed = gradeResult(row, hps, weightsInput);
  const term1 = numeric(row.term1) ?? computed.quarterly;
  const term2 = numeric(row.term2);
  const finalTerm = numeric(row.finalTerm);
  return { term1, term2, finalTerm, computed };
}

/**
 * Grade for one class-record term workbook.
 * Manual override (term1/term2/finalTerm) wins; otherwise use computed quarterly.
 */
export function resolveGradeForClassRecordTerm(
  studentRow,
  hps,
  weightsInput,
  term
) {
  const row = normalizeStudentRow(studentRow);
  const computed = gradeResult(row, hps, weightsInput);
  const t = Number(term);
  if (t === 2) return numeric(row.term2) ?? computed.quarterly;
  if (t === 3) return numeric(row.finalTerm) ?? computed.quarterly;
  return numeric(row.term1) ?? computed.quarterly;
}

/** Lowest Initial Grade that still transmute to at least the passing grade (75). */
export function minInitialGradeForPass(passingGrade = PASSING_GRADE) {
  for (let ig = 0; ig <= 100; ig += 1) {
    const tg = transmuteGrade(ig);
    if (tg != null && tg >= passingGrade) return ig;
  }
  return 60;
}

/**
 * Temporary min raw scores on blank S1/S2/TE cells so the learner can still pass.
 * Filled exam scores stay fixed; blank exams share the remaining needed points
 * in proportion to each exam's HPS. Teacher-only prediction — not official grades.
 */
export function predictExamMinimums(
  studentRow,
  hps,
  weightsInput,
  passingGrade = PASSING_GRADE
) {
  const row = normalizeStudentRow(studentRow);
  const weights = normalizeComponentWeights(weightsInput);
  const ww = componentResult(row.ww, hps.ww, weights.written);
  const pt = componentResult(row.pt, hps.pt, weights.performance);
  const examHps = {
    s1: numeric(hps?.exams?.s1),
    s2: numeric(hps?.exams?.s2),
    te: numeric(hps?.exams?.te),
  };

  const empty = {
    s1: null,
    s2: null,
    te: null,
    examPsNeeded: null,
    alreadyPassingWithoutBlanks: false,
    impossible: false,
    ready: false,
  };

  if (ww.ps == null || pt.ps == null) return empty;
  if (EXAMS.every((k) => examHps[k] == null || examHps[k] <= 0)) return empty;

  const igNeeded = minInitialGradeForPass(passingGrade);
  const examWsNeeded = igNeeded - (ww.ws || 0) - (pt.ws || 0);
  // Exam WS = examPS * assessmentWeight / 100
  const examPsNeeded =
    weights.assessment > 0 ? (examWsNeeded * 100) / weights.assessment : null;

  const filled = {};
  const blanks = [];
  let filledScoreSum = 0;
  let totalHps = 0;
  let blankHpsTotal = 0;

  for (const key of EXAMS) {
    const max = examHps[key];
    if (max == null || max <= 0) {
      filled[key] = null;
      continue;
    }
    totalHps += max;
    const score = numeric(row.exams[key]);
    if (score == null) {
      blanks.push(key);
      blankHpsTotal += max;
      filled[key] = null;
    } else {
      filledScoreSum += Math.min(Math.max(score, 0), max);
      filled[key] = score;
    }
  }

  if (totalHps <= 0 || examPsNeeded == null) return empty;

  const result = {
    s1: null,
    s2: null,
    te: null,
    examPsNeeded: Math.max(0, Math.min(100, examPsNeeded)),
    alreadyPassingWithoutBlanks: false,
    impossible: false,
    ready: true,
  };

  // If no blanks, nothing to predict
  if (!blanks.length) return { ...result, ready: true };

  const neededScoreSum = (examPsNeeded / 100) * totalHps;
  const remainingNeeded = neededScoreSum - filledScoreSum;

  if (remainingNeeded <= 0) {
    result.alreadyPassingWithoutBlanks = true;
    for (const key of blanks) result[key] = 0;
    return result;
  }

  if (remainingNeeded > blankHpsTotal + 1e-9) {
    result.impossible = true;
    for (const key of blanks) result[key] = examHps[key];
    return result;
  }

  for (const key of blanks) {
    const max = examHps[key];
    const share = (remainingNeeded * max) / blankHpsTotal;
    result[key] = Math.min(max, Math.ceil(share * 100) / 100);
  }
  return result;
}

/**
 * Whether real examination scores (S1/S2/TE) may be shown to student/parent.
 * Written / Performance stay live; exams wait until finished, reveal date, or lock.
 */
export function areExamsRevealedToStudents({
  workflowStatus,
  metadata = {},
  studentRow,
  hps,
  today = new Date().toISOString().slice(0, 10),
}) {
  if (workflowStatus === "locked") return true;

  const revealDate = String(metadata?.examRevealDate || "").slice(0, 10);
  if (revealDate && today >= revealDate) return true;

  const row = normalizeStudentRow(studentRow);
  const examHps = hps?.exams || {};
  const active = EXAMS.filter((key) => {
    const max = numeric(examHps[key]);
    return max != null && max > 0;
  });
  // Finished = every exam that has HPS also has a score (at least one exam required)
  if (!active.length) return false;
  return active.every((key) => numeric(row.exams[key]) != null);
}
