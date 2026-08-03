import {
  mapValidationItem as mapBase,
} from "@/lib/grade-validation-data";
import {
  normalizeComponentWeights,
  resolveGradeForClassRecordTerm,
} from "@/lib/class-record";
import { GRADE_WORKFLOW } from "@/lib/grade-workflow";
import { GRADE_LEVELS, SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import { normalizeGradeTerm, termLabel } from "@/lib/grades-terms";

export { GRADE_LEVELS };

const AWAITING_STATUSES = new Set([
  GRADE_WORKFLOW.ENDORSED,
]);

/** Enrich a class-record row for registrar grade lock UI. */
export function mapRegistrarGradeItem(row, studentDirectory = {}) {
  const base = mapBase(row);
  const assignment = row.teacher_assignments || row;
  const section = assignment.sections || {};
  const subject = assignment.subjects || {};
  const record = row.class_records || row.record || {};
  const data = record.data || {};
  const hps = data.hps || { ww: [], pt: [], exams: {} };
  const weights = normalizeComponentWeights(subject);
  const recordTerm = normalizeGradeTerm(record.term ?? 1);
  const students = [];

  for (const [studentId, studentRow] of Object.entries(data.students || {})) {
    const grade = resolveGradeForClassRecordTerm(
      studentRow,
      hps,
      weights,
      recordTerm
    );
    const profile = studentDirectory[studentId] || {};
    const name =
      [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
      profile.lrn ||
      studentId.slice(0, 8);
    students.push({
      studentId,
      name,
      lrn: profile.lrn || "",
      term: recordTerm,
      displayGrade: grade,
    });
  }

  students.sort((a, b) => String(a.name).localeCompare(String(b.name)));

  return {
    ...base,
    section_id: section.id || assignment.section_id || null,
    subject_id: subject.id || assignment.subject_id || null,
    term: recordTerm,
    term_label: termLabel(recordTerm),
    item_key: `${base.assignment_id || assignment.id}-${recordTerm}`,
    students,
    studentCount: students.length,
    record_id: record.id || null,
  };
}

function sortSubjects(list) {
  return [...list].sort((a, b) =>
    String(a.subject_name).localeCompare(String(b.subject_name))
  );
}

/**
 * Group queue items by grade → section.
 * Locked tab: only sections where every expected subject is locked (none awaiting).
 * Awaiting tab: only incomplete sections that still have subjects to lock.
 */
export function buildGradeSectionTree({
  items = [],
  sections = [],
  expectedBySection = {},
  statusMode = "awaiting", // awaiting | locked
}) {
  const byGrade = {};
  for (const g of GRADE_LEVELS) {
    byGrade[g] = {
      grade: g,
      sections: [],
      sectionCount: 0,
      completeCount: 0,
      subjectReady: 0,
      subjectExpected: 0,
    };
  }

  const itemsBySection = {};
  for (const item of items) {
    const sid = item.section_id;
    if (!sid) continue;
    if (!itemsBySection[sid]) itemsBySection[sid] = [];
    itemsBySection[sid].push(item);
  }

  const relevantSections = sections.filter((s) => {
    const g = Number(s.grade_level);
    return GRADE_LEVELS.includes(g);
  });

  for (const section of relevantSections) {
    const grade = Number(section.grade_level);
    if (!byGrade[grade]) continue;

    const allItems = itemsBySection[section.id] || [];
    if (!allItems.length) continue; // only sections with queue activity

    const lockedItems = allItems.filter(
      (i) => i.workflow_status === GRADE_WORKFLOW.LOCKED
    );
    const awaitingItems = allItems.filter((i) =>
      AWAITING_STATUSES.has(i.workflow_status)
    );

    const lockedCount = lockedItems.length;
    const expected = Math.max(
      lockedCount + awaitingItems.length,
      expectedBySection[section.id] || 0
    );
    // Fully locked = every subject in this section's queue is locked
    const complete =
      allItems.length > 0 &&
      awaitingItems.length === 0 &&
      lockedCount === allItems.length;

    if (statusMode === "locked") {
      if (!complete) continue;
      const displayItems = sortSubjects(lockedItems);
      byGrade[grade].sections.push({
        id: section.id,
        name: section.section_name,
        grade_level: grade,
        school_year: section.school_year || SCHOOL_YEAR_DEFAULT,
        track_strand: section.track_strand || null,
        items: displayItems,
        ready: lockedCount,
        expected: lockedCount,
        complete: true,
        statusMode,
      });
      byGrade[grade].sectionCount += 1;
      byGrade[grade].completeCount += 1;
      byGrade[grade].subjectReady += lockedCount;
      byGrade[grade].subjectExpected += lockedCount;
      continue;
    }

    // Awaiting: incomplete only — must still have subjects to lock
    if (complete || awaitingItems.length === 0) continue;

    const displayItems = sortSubjects([...awaitingItems, ...lockedItems]);

    byGrade[grade].sections.push({
      id: section.id,
      name: section.section_name,
      grade_level: grade,
      school_year: section.school_year || SCHOOL_YEAR_DEFAULT,
      track_strand: section.track_strand || null,
      items: displayItems,
      ready: lockedCount,
      expected: Math.max(expected, lockedCount + awaitingItems.length),
      complete: false,
      awaitingCount: awaitingItems.length,
      statusMode,
    });

    byGrade[grade].sectionCount += 1;
    byGrade[grade].subjectReady += lockedCount;
    byGrade[grade].subjectExpected += Math.max(
      expected,
      lockedCount + awaitingItems.length
    );
  }

  for (const g of GRADE_LEVELS) {
    byGrade[g].sections.sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    );
  }

  return byGrade;
}

/** Count sections that belong in a status tab (for badge totals). */
export function countSectionsForMode({
  items = [],
  sections = [],
  expectedBySection = {},
  statusMode = "awaiting",
}) {
  const tree = buildGradeSectionTree({
    items,
    sections,
    expectedBySection,
    statusMode,
  });
  return GRADE_LEVELS.reduce(
    (sum, g) => sum + (tree[g]?.sectionCount || 0),
    0
  );
}

export function gradeCompletionLabel(bucket) {
  if (!bucket?.sectionCount) return "No sections";
  if (bucket.statusMode === "locked" || bucket.completeCount >= bucket.sectionCount) {
    return "All complete";
  }
  return `${bucket.completeCount}/${bucket.sectionCount} sections done`;
}

/** Build student × subject grade matrix for a section's class records. */
export function buildSectionGradeMatrix(sectionItems = []) {
  const subjects = sectionItems.map((item) => ({
    assignmentId: item.assignment_id,
    itemKey: item.item_key || `${item.assignment_id}-${item.term || 1}`,
    subjectName: item.term_label
      ? `${item.subject_name} · ${item.term_label}`
      : item.subject_name,
    teacherName: item.teacher_name,
    workflow_status: item.workflow_status,
    term: item.term || 1,
  }));

  const byStudent = new Map();
  for (const item of sectionItems) {
    const key = item.item_key || `${item.assignment_id}-${item.term || 1}`;
    for (const stu of item.students || []) {
      if (!byStudent.has(stu.studentId)) {
        byStudent.set(stu.studentId, {
          studentId: stu.studentId,
          name: stu.name,
          lrn: stu.lrn,
          grades: {},
        });
      }
      const row = byStudent.get(stu.studentId);
      row.grades[key] = {
        displayGrade: stu.displayGrade,
        term: item.term || 1,
      };
    }
  }

  const students = Array.from(byStudent.values()).sort((a, b) =>
    String(a.name).localeCompare(String(b.name))
  );

  return { subjects, students };
}

export function isQueueStatusForMode(status, mode) {
  if (mode === "locked") return status === GRADE_WORKFLOW.LOCKED;
  return AWAITING_STATUSES.has(status);
}
