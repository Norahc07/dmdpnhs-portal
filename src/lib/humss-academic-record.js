import { gradeRemark, GRADE_TERMS } from "@/lib/grades-terms";

function numeric(value) {
  if (value === "" || value == null || Number.isNaN(Number(value))) return null;
  return Number(value);
}

/** Grade 12 HUMSS academic-record curriculum (DepEd SHS). */
export const HUMSS_G12_CURRICULUM = [
  {
    term: 1,
    label: "Term 1",
    subjects: [
      "Media and Information Literacy",
      "Earth and Life Science",
      "Physical Education and Health III",
      "Practical Research II",
      "Creative Non-Fiction",
      "Trends, Networks, and Critical Thinking in the 21st Century Culture",
    ],
  },
  {
    term: 2,
    label: "Term 2",
    subjects: [
      "Pagbasa at Pagsusuri ng Iba't-Ibang Teksto Tungo sa Pananaliksik",
      "Inquiries, Investigations, and Immersions (3Is)",
      "Introduction to World Religions and Belief Systems",
      "Community Engagement, Solidarity and Citizenship",
      "Work Immersion/Research/Culminating Activity",
    ],
  },
  {
    term: 3,
    label: "Term 3",
    subjects: [
      "Physical Science",
      "Contemporary Philippine Arts from the Regions",
      "Introduction to the Philosophy of the Human Person",
      "Physical Education and Health IV",
      "Entrepreneurship",
    ],
  },
];

export const ACADEMIC_REMARK_OPTIONS = ["Passed", "Failed"];

function foldName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SUBJECT_TERM_BY_NAME = (() => {
  const map = new Map();
  for (const block of HUMSS_G12_CURRICULUM) {
    for (const name of block.subjects) {
      map.set(foldName(name), block.term);
    }
  }
  map.set("3is", 2);
  map.set("inquiries investigations and immersions", 2);
  return map;
})();

export function isHumssGrade12(section, subject) {
  const grade = Number(
    section?.grade_level ?? subject?.grade_level ?? 0
  );
  const strand = String(
    section?.track_strand ||
      subject?.track_strand ||
      section?.section_name ||
      ""
  ).toUpperCase();
  return grade === 12 && strand.includes("HUMSS");
}

/** HUMSS attendance is taken on Term 2 subjects only. */
export const HUMSS_ATTENDANCE_TERM = 2;

export function humssAttendanceSubjectNames() {
  return (
    HUMSS_G12_CURRICULUM.find((block) => block.term === HUMSS_ATTENDANCE_TERM)
      ?.subjects || []
  );
}

export function isHumssAttendanceSubject(subject) {
  return humssSubjectTerm(subject) === HUMSS_ATTENDANCE_TERM;
}

export function filterHumssAttendanceSubjects(subjects = []) {
  return (subjects || []).filter((item) => isHumssAttendanceSubject(item));
}

export function humssSubjectTerm(subject) {
  const fromColumn = Number(subject?.academic_term);
  if ([1, 2, 3].includes(fromColumn)) return fromColumn;
  const fromName = SUBJECT_TERM_BY_NAME.get(foldName(subject?.subject_name));
  return fromName || null;
}

export function humssTermLabel(term) {
  const found = HUMSS_G12_CURRICULUM.find((t) => t.term === Number(term));
  if (found) return found.label;
  return GRADE_TERMS.find((t) => t.value === Number(term))?.label || `Term ${term}`;
}

export function normalizeAcademicStudentRow(saved = {}) {
  const finalGrade =
    saved.finalGrade ??
    saved.term1 ??
    saved.term2 ??
    saved.finalTerm ??
    "";
  return {
    finalGrade: finalGrade === null || finalGrade === undefined ? "" : String(finalGrade),
    remarks: String(saved.remarks ?? ""),
  };
}

export function resolveAcademicFinalGrade(studentRow) {
  const row = normalizeAcademicStudentRow(studentRow);
  return numeric(row.finalGrade);
}

export function resolveAcademicRemarks(studentRow) {
  const row = normalizeAcademicStudentRow(studentRow);
  const typed = row.remarks.trim();
  if (typed) return typed;
  return gradeRemark(resolveAcademicFinalGrade(row));
}

export function emptyAcademicRecordData(metadataDefaults, students) {
  const studentData = {};
  for (const student of students || []) {
    studentData[student.id] = normalizeAcademicStudentRow({});
  }
  return {
    mode: "academic_record",
    metadata: { ...(metadataDefaults || {}) },
    students: studentData,
  };
}

export function mergeAcademicRecordData(initialData, metadataDefaults, students) {
  const source = initialData || {};
  const existing = source.students || {};
  const studentData = {};
  for (const student of students || []) {
    studentData[student.id] = normalizeAcademicStudentRow(
      existing[student.id] || {}
    );
  }
  return {
    mode: "academic_record",
    metadata: {
      ...(metadataDefaults || {}),
      ...(source.metadata || {}),
    },
    students: studentData,
  };
}
