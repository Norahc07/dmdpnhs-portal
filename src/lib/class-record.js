import { transmuteGrade } from "@/lib/deped-grades";

const WW_COUNT = 10;
const PT_COUNT = 10;
const EXAMS = ["s1", "s2", "te"];

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
