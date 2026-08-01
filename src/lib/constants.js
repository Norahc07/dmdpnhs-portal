export const SCHOOL_NAME = "Dr. Maria D. Pastrana National High School";
export const SCHOOL_SHORT = "DMDPNHS";
export const SCHOOL_YEAR_DEFAULT = "2025-2026";

/** Public portal URL used in SMS messages */
export function portalBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://dmdpnhs-portal.vercel.app"
  );
}

export const ROLES = {
  STUDENT: "student",
  TEACHER: "teacher",
  PARENT: "parent",
  REGISTRAR: "registrar",
};

export const ROLE_HOME = {
  student: "/student",
  teacher: "/teacher",
  parent: "/parent",
  registrar: "/registrar",
};

export const DOCUMENT_TYPES = [
  "Form 137",
  "Certificate of Enrollment",
  "Good Moral",
  "Other",
];

export const DOCUMENT_STATUSES = ["Pending", "Processing", "Ready for Pickup"];

export const GRADE_LEVELS = [7, 8, 9, 10, 11, 12];

/** Senior High School strands (Grades 11–12) */
export const SHS_STRANDS = [
  "STEM ENGINEERING",
  "STEM MEDICAL",
  "HOSPITALITY AND TOURISM",
  "BUSINESS AND ENTREPRENEURSHIP",
  "ASSH-SOCIAL SCIENCE",
  "ASSH-COM. ARTS FILIPINO",
];

export function isSeniorHighGrade(gradeLevel) {
  const g = Number(gradeLevel);
  return g === 11 || g === 12;
}

/**
 * Next alphabet letter for a strand section within the same grade + school year.
 * Existing names like "STEM ENGINEERING A" → next is "B".
 */
export function nextStrandSectionLetter(existingSectionNames, strand) {
  const prefix = `${strand} `;
  const used = new Set();
  for (const name of existingSectionNames || []) {
    if (!String(name).startsWith(prefix)) continue;
    const letter = String(name).slice(prefix.length).trim().toUpperCase();
    if (/^[A-Z]$/.test(letter)) used.add(letter);
  }
  for (let i = 0; i < 26; i += 1) {
    const letter = String.fromCharCode(65 + i); // A–Z
    if (!used.has(letter)) return letter;
  }
  return null;
}

export const QUARTERS = [1, 2, 3];

/** Term codes: 1 = 1st Term, 2 = 2nd Term, 3 = Final Term */
export const GRADE_TERM_CODES = [1, 2, 3];

export const ATTENDANCE_STATUSES = ["present", "absent", "late"];

export const STATUS_BADGE_STYLES = {
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  Processing: "bg-sky-100 text-sky-800 border-sky-200",
  "Ready for Pickup": "bg-emerald-100 text-emerald-800 border-emerald-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  incomplete: "bg-neutral-100 text-neutral-700 border-neutral-200",
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  enrolled: "bg-emerald-100 text-emerald-800 border-emerald-200",
  remedial: "bg-orange-100 text-orange-800 border-orange-200",
  retained: "bg-rose-100 text-rose-800 border-rose-200",
  promoted: "bg-blue-100 text-blue-800 border-blue-200",
  present: "bg-emerald-100 text-emerald-800 border-emerald-200",
  absent: "bg-rose-100 text-rose-800 border-rose-200",
  late: "bg-amber-100 text-amber-800 border-amber-200",
  draft: "bg-neutral-100 text-neutral-700 border-neutral-200",
  submitted: "bg-sky-100 text-sky-800 border-sky-200",
  under_review: "bg-amber-100 text-amber-900 border-amber-200",
  returned: "bg-rose-100 text-rose-800 border-rose-200",
  endorsed: "bg-violet-100 text-violet-800 border-violet-200",
  locked: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

/** Shared year suffix for Teacher / Parent IDs, e.g. 2026 → "26" */
export function teacherIdYearCode(date = new Date()) {
  return String(date.getFullYear()).slice(-2);
}

export const parentIdYearCode = teacherIdYearCode;

/** Example Teacher ID format for UI copy, e.g. T26-12345 */
export function teacherIdFormatExample(date = new Date()) {
  return `T${teacherIdYearCode(date)}-12345`;
}

/** Example Parent Access Code, e.g. P26-12345 */
export function parentAccessCodeFormatExample(date = new Date()) {
  return `P${parentIdYearCode(date)}-12345`;
}

export function studentEmailFromLrn(lrn) {
  return `${lrn}@student.dmdpnhs.edu.ph`;
}

export function parentEmailFromCode(accessCode) {
  return `${accessCode.toLowerCase()}@parent.dmdpnhs.edu.ph`;
}

export function formatBirthdatePassword(birthdate) {
  // Accepts Date or YYYY-MM-DD string → YYYYMMDD
  const raw = String(birthdate).slice(0, 10).replaceAll("-", "");
  return raw;
}
