/** Class-record / reading-committee workflow statuses */
export const GRADE_WORKFLOW = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  RETURNED: "returned",
  ENDORSED: "endorsed",
  LOCKED: "locked",
};

export const GRADE_WORKFLOW_LABELS = {
  draft: "Draft",
  submitted: "Submitted for review",
  under_review: "Under committee review",
  returned: "Returned to teacher",
  endorsed: "Endorsed (awaiting lock)",
  locked: "Locked / published",
};

export const FACULTY_POSITIONS = [
  { value: "teacher", label: "Regular teacher" },
  { value: "sub_teacher", label: "Sub-teacher" },
  { value: "department_head", label: "Department head" },
];

export const FACULTY_POSITION_LABELS = Object.fromEntries(
  FACULTY_POSITIONS.map((p) => [p.value, p.label])
);

export const DEPARTMENT_BANDS = [
  { value: "jhs", label: "Junior High (7–10)" },
  { value: "shs", label: "Senior High (11–12)" },
  { value: "all", label: "All levels" },
];

export function canTeacherEditWorkflow(status) {
  return status === GRADE_WORKFLOW.DRAFT || status === GRADE_WORKFLOW.RETURNED;
}

export function canSubmitWorkflow(status) {
  return status === GRADE_WORKFLOW.DRAFT || status === GRADE_WORKFLOW.RETURNED;
}

export function canDeptHeadReview(status) {
  return (
    status === GRADE_WORKFLOW.SUBMITTED ||
    status === GRADE_WORKFLOW.UNDER_REVIEW
  );
}

export function canRegistrarLock(status) {
  return status === GRADE_WORKFLOW.ENDORSED || status === GRADE_WORKFLOW.SUBMITTED;
}

export function workflowBadgeClass(status) {
  const map = {
    draft: "bg-neutral-100 text-neutral-700 border-neutral-200",
    submitted: "bg-sky-100 text-sky-800 border-sky-200",
    under_review: "bg-amber-100 text-amber-900 border-amber-200",
    returned: "bg-rose-100 text-rose-800 border-rose-200",
    endorsed: "bg-violet-100 text-violet-800 border-violet-200",
    locked: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };
  return map[status] || map.draft;
}
