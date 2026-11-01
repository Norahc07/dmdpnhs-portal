import { SCHOOL_YEAR_DEFAULT, isSeniorHighGrade } from "@/lib/constants";
import { normalizeGradeTerm } from "@/lib/grades-terms";

/**
 * Catalog subjects for an SHS grade + strand + term.
 * Includes strand majors and shared minors (track_strand null + subject_kind minor).
 */
export async function listShsTermSubjects(
  db,
  { gradeLevel, strand, term }
) {
  const grade = Number(gradeLevel);
  const t = normalizeGradeTerm(term);
  const strandKey = String(strand || "").trim();
  if (!isSeniorHighGrade(grade) || !strandKey) return [];

  const { data, error } = await db
    .from("subjects")
    .select(
      "id, subject_name, grade_level, track_strand, academic_term, subject_kind"
    )
    .eq("grade_level", grade)
    .eq("academic_term", t)
    .order("subject_name");

  if (error) {
    // Columns may be missing before migration — fall back to strand-only catalog.
    const fallback = await db
      .from("subjects")
      .select("id, subject_name, grade_level, track_strand")
      .eq("grade_level", grade)
      .order("subject_name");
    return (fallback.data || []).filter((s) => {
      const ts = String(s.track_strand || "").trim();
      return !ts || ts.toUpperCase() === strandKey.toUpperCase();
    });
  }

  const strandUpper = strandKey.toUpperCase();
  return (data || []).filter((s) => {
    const ts = String(s.track_strand || "").trim();
    if (!ts) {
      return String(s.subject_kind || "major").toLowerCase() === "minor";
    }
    return ts.toUpperCase() === strandUpper || ts.toUpperCase().includes(strandUpper);
  });
}

/**
 * Idempotent enroll of a student into all catalog subjects for their
 * grade + section strand + term.
 */
export async function enrollStudentInTermSubjects(
  db,
  {
    studentId,
    sectionId,
    gradeLevel,
    strand,
    term,
    schoolYear = SCHOOL_YEAR_DEFAULT,
  }
) {
  if (!studentId) return { error: "Student id is required." };
  if (!isSeniorHighGrade(gradeLevel)) {
    return { ok: true, enrolled: 0, skipped: true, message: "Not SHS." };
  }

  const t = normalizeGradeTerm(term);
  let resolvedStrand = String(strand || "").trim();
  let resolvedSectionId = sectionId || null;

  if ((!resolvedStrand || !resolvedSectionId) && sectionId) {
    const { data: section } = await db
      .from("sections")
      .select("id, track_strand, grade_level")
      .eq("id", sectionId)
      .maybeSingle();
    if (section) {
      resolvedSectionId = section.id;
      resolvedStrand = resolvedStrand || section.track_strand || "";
    }
  }

  if (!resolvedStrand) {
    return {
      error:
        "Section has no strand. Assign a track/strand on the section before enrolling SHS subjects.",
    };
  }

  const subjects = await listShsTermSubjects(db, {
    gradeLevel,
    strand: resolvedStrand,
    term: t,
  });

  if (!subjects.length) {
    return {
      error: `No Term ${t} subjects found for Grade ${gradeLevel} ${resolvedStrand}. Add them under Academics → Subjects first.`,
    };
  }

  const rows = subjects.map((s) => ({
    student_id: studentId,
    subject_id: s.id,
    section_id: resolvedSectionId,
    school_year: schoolYear,
    term: t,
    status: "enrolled",
    updated_at: new Date().toISOString(),
  }));

  const { error } = await db.from("student_subject_enrollments").upsert(rows, {
    onConflict: "student_id,subject_id,school_year,term",
  });

  if (error) {
    if (/student_subject_enrollments/i.test(error.message || "")) {
      return {
        error:
          "Subject enrollment table is missing. Apply supabase/shs-term-subjects.sql in the Supabase SQL editor.",
      };
    }
    return { error: error.message };
  }

  return {
    ok: true,
    enrolled: rows.length,
    term: t,
    strand: resolvedStrand,
    message: `Enrolled in ${rows.length} Term ${t} subject${rows.length === 1 ? "" : "s"} (${resolvedStrand}).`,
  };
}

/**
 * Student ids enrolled in a subject for a section/year/term.
 * Returns null when the enrollments table is unused/missing (caller should fall back).
 */
export async function listSubjectEnrolledStudentIds(
  db,
  { sectionId, subjectId, schoolYear, term }
) {
  if (!sectionId || !subjectId) return null;

  let query = db
    .from("student_subject_enrollments")
    .select("student_id")
    .eq("section_id", sectionId)
    .eq("subject_id", subjectId)
    .eq("school_year", schoolYear || SCHOOL_YEAR_DEFAULT)
    .eq("status", "enrolled");

  if (term != null) {
    query = query.eq("term", normalizeGradeTerm(term));
  }

  const { data, error } = await query;
  if (error) {
    if (/student_subject_enrollments|does not exist|schema cache/i.test(error.message || "")) {
      return null;
    }
    return null;
  }

  if (!data?.length) return [];
  return data.map((r) => r.student_id).filter(Boolean);
}

export async function listStudentEnrolledSubjects(
  db,
  { studentId, schoolYear, term }
) {
  if (!studentId) return [];

  let query = db
    .from("student_subject_enrollments")
    .select(
      `
      id,
      term,
      status,
      subjects ( id, subject_name, academic_term, subject_kind, track_strand, grade_level )
    `
    )
    .eq("student_id", studentId)
    .eq("school_year", schoolYear || SCHOOL_YEAR_DEFAULT)
    .eq("status", "enrolled");

  if (term != null) {
    query = query.eq("term", normalizeGradeTerm(term));
  }

  const { data, error } = await query;
  if (error) return [];
  return (data || [])
    .map((row) => row.subjects)
    .filter(Boolean);
}
