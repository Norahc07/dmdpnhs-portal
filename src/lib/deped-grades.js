/**
 * DepEd Order No. 8, s. 2015 grade computation utilities.
 * Initial Grade (IG) → Transmuted Grade (TG) using the official mapping.
 */

/** Build discrete DepEd transmutation map (IG 0–100 → TG). */
function buildTransmutationTable() {
  const table = {};

  // IG 100 → 100 down to IG 60 → 75
  for (let ig = 100; ig >= 60; ig -= 1) {
    table[ig] = Math.round(((ig - 60) / 40) * 25 + 75);
  }

  // IG 59 → 74 down to IG 0 → 60
  for (let ig = 59; ig >= 0; ig -= 1) {
    table[ig] = Math.round((ig / 60) * 14 + 60);
  }

  return table;
}

const TRANSMUTATION = buildTransmutationTable();

export function transmuteGrade(initialGrade) {
  if (initialGrade == null || Number.isNaN(Number(initialGrade))) return null;
  const ig = Math.min(100, Math.max(0, Math.round(Number(initialGrade))));
  return TRANSMUTATION[ig];
}

export function averageScores(scores = []) {
  const valid = scores
    .map((s) => ({
      score: Number(s?.score),
      max: Number(s?.max ?? s?.hps ?? 100),
    }))
    .filter((s) => !Number.isNaN(s.score) && s.max > 0);

  if (!valid.length) return null;

  const totalPercent = valid.reduce(
    (sum, s) => sum + (s.score / s.max) * 100,
    0
  );
  return totalPercent / valid.length;
}

/**
 * Compute DepEd component totals and final grade.
 * @param {object} params
 * @param {Array} params.writtenScores - [{ id, label, score, max }]
 * @param {Array} params.performanceScores
 * @param {number|null} params.assessmentScore - already a percentage 0–100
 * @param {number} params.writtenWeight
 * @param {number} params.performanceWeight
 * @param {number} params.assessmentWeight
 */
export function computeDepEdGrade({
  writtenScores = [],
  performanceScores = [],
  assessmentScore = null,
  writtenWeight = 40,
  performanceWeight = 40,
  assessmentWeight = 20,
}) {
  const ww = averageScores(writtenScores);
  const pt = averageScores(performanceScores);
  const qa =
    assessmentScore == null || assessmentScore === ""
      ? null
      : Number(assessmentScore);

  const parts = [];
  if (ww != null) parts.push({ value: ww, weight: writtenWeight });
  if (pt != null) parts.push({ value: pt, weight: performanceWeight });
  if (qa != null && !Number.isNaN(qa)) {
    parts.push({ value: qa, weight: assessmentWeight });
  }

  if (!parts.length) {
    return {
      writtenPercent: ww,
      performancePercent: pt,
      assessmentPercent: qa,
      initialGrade: null,
      transmutedGrade: null,
    };
  }

  const weightSum = parts.reduce((s, p) => s + p.weight, 0);
  const initialGrade =
    parts.reduce((s, p) => s + p.value * p.weight, 0) / weightSum;

  return {
    writtenPercent: ww == null ? null : Number(ww.toFixed(2)),
    performancePercent: pt == null ? null : Number(pt.toFixed(2)),
    assessmentPercent: qa == null ? null : Number(qa.toFixed(2)),
    initialGrade: Number(initialGrade.toFixed(2)),
    transmutedGrade: transmuteGrade(initialGrade),
  };
}

export function descriptorForGrade(tg) {
  if (tg == null) return "—";
  if (tg >= 90) return "Outstanding";
  if (tg >= 85) return "Very Satisfactory";
  if (tg >= 80) return "Satisfactory";
  if (tg >= 75) return "Fairly Satisfactory";
  return "Did Not Meet Expectations";
}
