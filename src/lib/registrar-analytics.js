import { GRADE_LEVELS, SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import { GRADE_WORKFLOW } from "@/lib/grade-workflow";

function sortSchoolYears(years) {
  return Array.from(years)
    .filter(Boolean)
    .sort((a, b) => String(b).localeCompare(String(a)));
}

function emptyYearMetrics(schoolYear) {
  return {
    schoolYear,
    enrolled: 0,
    male: 0,
    female: 0,
    otherGender: 0,
    sections: 0,
    assignments: 0,
    teachers: 0,
    gradedLearners: 0,
    gradeEntries: 0,
    gradedWithFinal: 0,
    passedEntries: 0,
    passRate: null,
    lockedRecords: 0,
    byGrade: Object.fromEntries(GRADE_LEVELS.map((g) => [g, 0])),
  };
}

/**
 * Aggregate registrar-facing metrics keyed by school year.
 * Enrollment uses current section placement (students in that year's sections).
 * Grades / assignments / locked records use their stored school_year (historical).
 */
export function buildRegistrarYearMetrics({
  sections = [],
  students = [],
  assignments = [],
  grades = [],
  classRecords = [],
}) {
  const years = new Set([SCHOOL_YEAR_DEFAULT]);
  for (const row of sections) if (row?.school_year) years.add(row.school_year);
  for (const row of assignments) if (row?.school_year) years.add(row.school_year);
  for (const row of grades) if (row?.school_year) years.add(row.school_year);
  for (const row of classRecords) {
    const sy = row?.teacher_assignments?.school_year;
    if (sy) years.add(sy);
  }

  const schoolYears = sortSchoolYears(years);
  const byYear = Object.fromEntries(
    schoolYears.map((year) => [year, emptyYearMetrics(year)])
  );

  const sectionIdsByYear = {};
  for (const section of sections) {
    const year = section.school_year;
    if (!year || !byYear[year]) continue;
    byYear[year].sections += 1;
    if (!sectionIdsByYear[year]) sectionIdsByYear[year] = new Set();
    sectionIdsByYear[year].add(section.id);
  }

  const sectionYearById = Object.fromEntries(
    sections.filter((s) => s?.id && s?.school_year).map((s) => [s.id, s.school_year])
  );

  for (const student of students) {
    const year = student.section_id
      ? sectionYearById[student.section_id]
      : null;
    if (!year || !byYear[year]) continue;
    const bucket = byYear[year];
    bucket.enrolled += 1;
    if (student.gender === "Male") bucket.male += 1;
    else if (student.gender === "Female") bucket.female += 1;
    else bucket.otherGender += 1;

    const grade = Number(student.grade_level);
    if (GRADE_LEVELS.includes(grade)) {
      bucket.byGrade[grade] += 1;
    }
  }

  const teachersByYear = {};
  for (const assignment of assignments) {
    const year = assignment.school_year;
    if (!year || !byYear[year]) continue;
    byYear[year].assignments += 1;
    if (!teachersByYear[year]) teachersByYear[year] = new Set();
    if (assignment.teacher_id) teachersByYear[year].add(assignment.teacher_id);
  }
  for (const [year, set] of Object.entries(teachersByYear)) {
    byYear[year].teachers = set.size;
  }

  const gradedLearnersByYear = {};
  for (const grade of grades) {
    const year = grade.school_year;
    if (!year || !byYear[year]) continue;
    const bucket = byYear[year];
    bucket.gradeEntries += 1;
    if (!gradedLearnersByYear[year]) gradedLearnersByYear[year] = new Set();
    if (grade.student_id) gradedLearnersByYear[year].add(grade.student_id);

    const final = Number(grade.final_transmuted_grade);
    if (Number.isFinite(final)) {
      bucket.gradedWithFinal += 1;
      if (final >= 75) bucket.passedEntries += 1;
    }
  }
  for (const [year, set] of Object.entries(gradedLearnersByYear)) {
    byYear[year].gradedLearners = set.size;
    const bucket = byYear[year];
    bucket.passRate =
      bucket.gradedWithFinal > 0
        ? Math.round((bucket.passedEntries / bucket.gradedWithFinal) * 1000) / 10
        : null;
  }

  for (const record of classRecords) {
    const year = record?.teacher_assignments?.school_year;
    if (!year || !byYear[year]) continue;
    if (record.workflow_status === GRADE_WORKFLOW.LOCKED) {
      byYear[year].lockedRecords += 1;
    }
  }

  return {
    schoolYears,
    byYear,
    defaultYear: schoolYears[0] || SCHOOL_YEAR_DEFAULT,
    compareYear: schoolYears[1] || null,
  };
}

export function deltaPercent(current, previous) {
  if (previous == null || previous === 0) {
    if (current == null || current === 0) return null;
    return 100;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function deltaAbsolute(current, previous) {
  if (current == null || previous == null) return null;
  return current - previous;
}

/** Server-side fetch for registrar dashboard analytics. */
export async function fetchRegistrarAnalytics(supabase) {
  const [
    { data: sections, error: sectionsError },
    { data: students, error: studentsError },
    { data: assignments, error: assignmentsError },
    { data: grades, error: gradesError },
    { data: classRecords, error: classRecordsError },
  ] = await Promise.all([
    supabase
      .from("sections")
      .select("id, grade_level, section_name, school_year"),
    supabase
      .from("students")
      .select("id, gender, grade_level, section_id, status")
      .eq("status", "enrolled"),
    supabase
      .from("teacher_assignments")
      .select("id, teacher_id, school_year, section_id, subject_id"),
    supabase
      .from("grades")
      .select("student_id, school_year, final_transmuted_grade"),
    supabase
      .from("class_records")
      .select("id, workflow_status, teacher_assignments(school_year)"),
  ]);

  const firstError =
    sectionsError ||
    studentsError ||
    assignmentsError ||
    gradesError ||
    classRecordsError;
  if (firstError) {
    console.error("Registrar analytics fetch failed:", firstError.message);
  }

  return buildRegistrarYearMetrics({
    sections: sections || [],
    students: students || [],
    assignments: assignments || [],
    grades: grades || [],
    classRecords: classRecords || [],
  });
}
