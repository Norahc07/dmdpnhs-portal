/** Term codes stored in grades.quarter and class_records.term (1–3). */
export const GRADE_TERMS = [
  {
    value: 1,
    key: "term1",
    shortLabel: "1st Term",
    label: "1st Term",
  },
  {
    value: 2,
    key: "term2",
    shortLabel: "2nd Term",
    label: "2nd Term",
  },
  {
    value: 3,
    key: "finalTerm",
    shortLabel: "Final Term",
    label: "Final Term",
  },
];

export const PASSING_GRADE = 75;

export function normalizeGradeTerm(term) {
  const n = Number(term);
  return [1, 2, 3].includes(n) ? n : 1;
}

export function termLabel(term) {
  const found = GRADE_TERMS.find((t) => t.value === Number(term));
  return found?.label || `Term ${term}`;
}

export function termShortLabel(term) {
  const found = GRADE_TERMS.find((t) => t.value === Number(term));
  return found?.shortLabel || `Term ${term}`;
}

export function termGradeFieldKey(term) {
  const found = GRADE_TERMS.find((t) => t.value === Number(term));
  return found?.key || "term1";
}

export function termOptionLabel(term, schoolYear) {
  return `${termLabel(term)} School Year ${schoolYear}`;
}

export function termOptionValue(term, schoolYear) {
  return `${schoolYear}::${Number(term)}`;
}

export function parseTermOptionValue(value) {
  if (!value || !String(value).includes("::")) return null;
  const [schoolYear, term] = String(value).split("::");
  const termNum = Number(term);
  if (!schoolYear || ![1, 2, 3].includes(termNum)) return null;
  return { schoolYear, term: termNum };
}

export function isPassingGrade(grade) {
  if (grade == null || grade === "" || Number.isNaN(Number(grade))) return null;
  return Number(grade) >= PASSING_GRADE;
}

export function gradeToneClass(grade) {
  const passed = isPassingGrade(grade);
  if (passed == null) return "text-muted-foreground";
  return passed ? "text-emerald-700" : "text-[#800000]";
}

export function gradeRemark(grade) {
  const passed = isPassingGrade(grade);
  if (passed == null) return "—";
  return passed ? "Passed" : "Failed";
}

/**
 * Build unique term options from grade rows, newest school year first.
 * Always includes the three terms for each school year that has any grade.
 */
export function buildTermOptions(grades = [], fallbackSchoolYear) {
  const years = new Set();
  for (const g of grades) {
    if (g.school_year) years.add(g.school_year);
  }
  if (fallbackSchoolYear) years.add(fallbackSchoolYear);

  const sortedYears = [...years].sort((a, b) => b.localeCompare(a));
  const options = [];
  for (const year of sortedYears) {
    for (const term of GRADE_TERMS) {
      options.push({
        value: termOptionValue(term.value, year),
        label: termOptionLabel(term.value, year),
        schoolYear: year,
        term: term.value,
      });
    }
  }
  return options;
}
