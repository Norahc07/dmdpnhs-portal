import { gradeResult, normalizeStudentRow } from "@/lib/class-record";
import { PASSING_GRADE } from "@/lib/grades-terms";
import { GRADE_WORKFLOW } from "@/lib/grade-workflow";

/** Count learners with computed quarterly grade below passing (when computable). */
export function countFailingFromClassRecord(data, weights) {
  if (!data?.students) return 0;
  const hps = data.hps || { ww: [], pt: [], exams: { s1: "", s2: "", te: "" } };
  let fails = 0;
  for (const row of Object.values(data.students)) {
    const normalized = normalizeStudentRow(row);
    const result = gradeResult(normalized, hps, weights);
    const grade =
      Number(normalized.term1) ||
      result.quarterly ||
      Number(normalized.finalTerm) ||
      null;
    if (grade != null && Number(grade) < PASSING_GRADE) fails += 1;
  }
  return fails;
}

export function mapValidationItem(row) {
  const assignment = row.teacher_assignments || row;
  const section = assignment.sections || {};
  const subject = assignment.subjects || {};
  const teacher = assignment.teachers || {};
  const profile = teacher.profiles || {};
  const record = row.class_records || row.record || {};
  const weights = subject;

  return {
    assignment_id: assignment.id || row.assignment_id,
    workflow_status: record.workflow_status || GRADE_WORKFLOW.DRAFT,
    review_notes: record.review_notes || null,
    submitted_at: record.submitted_at || null,
    subject_name: subject.subject_name || "Subject",
    grade_level: section.grade_level,
    section_name: section.section_name,
    school_year: assignment.school_year || section.school_year,
    teacher_name: [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(" ") || "—",
    failCount: countFailingFromClassRecord(record.data, weights),
  };
}
