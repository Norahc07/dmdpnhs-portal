/** Class-record publish flow:
 * draft → under_review (pending validation) → endorsed → locked
 * under_review can also be returned to the teacher.
 */
export const GRADE_WORKFLOW = {
  DRAFT: "draft",
  SUBMITTED: "submitted", // legacy alias treated as pending
  UNDER_REVIEW: "under_review",
  RETURNED: "returned",
  ENDORSED: "endorsed",
  LOCKED: "locked",
};

export const GRADE_WORKFLOW_LABELS = {
  draft: "Draft",
  submitted: "Pending validation",
  under_review: "Pending validation",
  returned: "Returned to teacher",
  endorsed: "Validated — awaiting publish",
  locked: "Locked / published",
};

export const FACULTY_POSITIONS = [
  { value: "teacher", label: "Regular teacher" },
  { value: "sub_teacher", label: "Sub-teacher" },
  { value: "department_head", label: "Department head / committee" },
];

export const FACULTY_POSITION_LABELS = Object.fromEntries(
  FACULTY_POSITIONS.map((p) => [p.value, p.label])
);

export const DEPARTMENT_BANDS = [
  { value: "jhs", label: "Junior High" },
  { value: "shs", label: "Senior High" },
  { value: "all", label: "All levels" },
];

export const DEPARTMENT_BAND_OPTIONS = [
  { value: "jhs", label: "Junior High", grades: [7, 8, 9, 10] },
  { value: "shs", label: "Senior High", grades: [11, 12] },
];

export function canTeacherEditWorkflow(status) {
  return status === GRADE_WORKFLOW.DRAFT || status === GRADE_WORKFLOW.RETURNED;
}

export function canSubmitWorkflow(status) {
  return status === GRADE_WORKFLOW.DRAFT || status === GRADE_WORKFLOW.RETURNED;
}

/** Department head / committee can validate pending class records. */
export function canDeptHeadReview(status) {
  return (
    status === GRADE_WORKFLOW.UNDER_REVIEW ||
    status === GRADE_WORKFLOW.SUBMITTED
  );
}

/** Registrar locks only after department head / committee validation. */
export function canRegistrarLock(status) {
  return status === GRADE_WORKFLOW.ENDORSED;
}

export function isPendingValidation(status) {
  return (
    status === GRADE_WORKFLOW.UNDER_REVIEW ||
    status === GRADE_WORKFLOW.SUBMITTED
  );
}

export function workflowBadgeClass(status) {
  const map = {
    draft: "bg-neutral-100 text-neutral-700 border-neutral-200",
    submitted: "bg-amber-100 text-amber-900 border-amber-200",
    under_review: "bg-amber-100 text-amber-900 border-amber-200",
    returned: "bg-rose-100 text-rose-800 border-rose-200",
    endorsed: "bg-violet-100 text-violet-800 border-violet-200",
    locked: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };
  return map[status] || map.draft;
}
