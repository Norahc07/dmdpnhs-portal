"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  areExamsRevealedToStudents,
  EXAMS,
  gradeResult,
  normalizeComponentWeights,
  normalizeStudentRow,
  numeric,
  predictExamMinimums,
  resolveGradeForClassRecordTerm,
} from "@/lib/class-record";
import { GRADE_WORKFLOW } from "@/lib/grade-workflow";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import {
  normalizeGradeTerm,
  PASSING_GRADE,
  termLabel,
} from "@/lib/grades-terms";

async function assertCanViewStudentGrades(admin, profile, studentId) {
  if (profile.role === "student") {
    const { data: student } = await admin
      .from("students")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (!student || student.id !== studentId) {
      return { error: "You can only view your own grades." };
    }
    return { ok: true };
  }

  if (profile.role === "parent") {
    const { data: parent } = await admin
      .from("parents")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (!parent) return { error: "Parent record not found." };
    const { data: link } = await admin
      .from("parent_student_links")
      .select("id")
      .eq("parent_id", parent.id)
      .eq("student_id", studentId)
      .maybeSingle();
    if (!link) {
      return { error: "That learner is not linked to your account." };
    }
    return { ok: true };
  }

  return { error: "Not allowed." };
}

function displayNum(value, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  const fixed = n.toFixed(digits).replace(/\.00$/, "");
  return digits === 0 ? Math.round(n) : Number(fixed);
}

/**
 * Student/parent POV for one learner:
 * - Written Works + Performance Tasks: live (actual scores as teacher encodes)
 * - Examinations (S1/S2/TE): real scores only when finished, reveal date, or locked;
 *   otherwise temporary min-to-pass predictions (never classmates)
 */
export async function getStudentSemestralGrades({
  studentId,
  schoolYear,
} = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { error: "Unauthorized" };

  const sid = String(studentId || "").trim();
  if (!sid) return { error: "Missing student." };

  const admin = createAdminClient();
  const access = await assertCanViewStudentGrades(admin, profile, sid);
  if (access.error) return { error: access.error };

  const sy = schoolYear || SCHOOL_YEAR_DEFAULT;
  const today = new Date().toISOString().slice(0, 10);

  const { data: student } = await admin
    .from("students")
    .select(
      "id, section_id, grade_level, lrn, profiles(first_name, last_name), sections(id, section_name, grade_level, school_year)"
    )
    .eq("id", sid)
    .maybeSingle();

  if (!student) return { error: "Student not found." };
  if (!student.section_id) {
    return {
      student,
      schoolYear: sy,
      rows: [],
      message: "No section assigned yet.",
    };
  }

  const { data: assignments } = await admin
    .from("teacher_assignments")
    .select(
      `
      id,
      subject_id,
      school_year,
      subjects ( id, subject_name, written_weight, performance_weight, assessment_weight )
    `
    )
    .eq("section_id", student.section_id)
    .eq("school_year", sy);

  if (!assignments?.length) {
    return { student, schoolYear: sy, rows: [] };
  }

  const assignmentIds = assignments.map((a) => a.id);
  let records = [];
  {
    // Live WW/PT: include draft → locked (not only locked)
    const withTerm = await admin
      .from("class_records")
      .select("id, assignment_id, term, data, workflow_status")
      .in("assignment_id", assignmentIds);
    if (!withTerm.error) {
      records = withTerm.data || [];
    } else if (String(withTerm.error.message || "").toLowerCase().includes("term")) {
      const legacy = await admin
        .from("class_records")
        .select("id, assignment_id, data, workflow_status")
        .in("assignment_id", assignmentIds);
      records = (legacy.data || []).map((r) => ({ ...r, term: 1 }));
    }
  }

  const recordsByAssignment = new Map();
  for (const record of records || []) {
    const list = recordsByAssignment.get(record.assignment_id) || [];
    list.push(record);
    recordsByAssignment.set(record.assignment_id, list);
  }

  const rows = [];
  const learnerName = [
    student.profiles?.last_name,
    student.profiles?.first_name,
  ]
    .filter(Boolean)
    .join(", ");

  for (const assignment of assignments) {
    const list = recordsByAssignment.get(assignment.id) || [];
    for (const record of list) {
      if (!record?.data) continue;

      const data = record.data || {};
      // Strict: only this student's row — never classmates
      const rawStudentRow = data.students?.[sid];
      if (!rawStudentRow) continue;

      const studentRow = normalizeStudentRow(rawStudentRow);
      const recordTerm = normalizeGradeTerm(record.term ?? 1);
      const weights = normalizeComponentWeights(assignment.subjects || {});
      const hps = data.hps || {
        ww: [],
        pt: [],
        exams: { s1: "", s2: "", te: "" },
      };
      const metadata = data.metadata || {};
      const workflowStatus = record.workflow_status || GRADE_WORKFLOW.DRAFT;
      const result = gradeResult(studentRow, hps, weights);
      const examsRevealed = areExamsRevealedToStudents({
        workflowStatus,
        metadata,
        studentRow,
        hps,
        today,
      });
      const prediction = predictExamMinimums(
        studentRow,
        hps,
        weights,
        PASSING_GRADE
      );

      const examsView = {};
      for (const key of EXAMS) {
        const actual = numeric(studentRow.exams[key]);
        const minPass = prediction?.[key];
        if (examsRevealed) {
          examsView[key] = {
            mode: actual != null ? "actual" : "empty",
            value: actual,
            label: actual != null ? String(displayNum(actual, 0) ?? actual) : "—",
          };
        } else if (actual != null) {
          // Teacher already encoded — keep hidden until reveal rules
          examsView[key] = {
            mode: "locked",
            value: null,
            label: "Locked",
          };
        } else if (minPass != null && prediction.ready) {
          examsView[key] = {
            mode: "prediction",
            value: minPass,
            label: prediction.impossible
              ? `need ${displayNum(minPass, 0)}*`
              : prediction.alreadyPassingWithoutBlanks
                ? "≥0"
                : `≥${displayNum(minPass, 0)}`,
          };
        } else {
          examsView[key] = { mode: "empty", value: null, label: "—" };
        }
      }

      const semestralGrade = examsRevealed
        ? resolveGradeForClassRecordTerm(
            studentRow,
            hps,
            weights,
            recordTerm
          )
        : null;

      const hasAnyScore =
        studentRow.ww.some((v) => numeric(v) != null) ||
        studentRow.pt.some((v) => numeric(v) != null) ||
        EXAMS.some((k) => numeric(studentRow.exams[k]) != null) ||
        semestralGrade != null;
      if (!hasAnyScore && !prediction.ready) continue;

      rows.push({
        id: `${record.id}-${sid}`,
        subject_id: assignment.subject_id,
        subject_name: assignment.subjects?.subject_name || "Subject",
        school_year: sy,
        term: recordTerm,
        term_label: termLabel(recordTerm),
        workflow_status: workflowStatus,
        exams_revealed: examsRevealed,
        exam_reveal_date: String(metadata.examRevealDate || "").slice(0, 10) || null,
        semestral_grade: semestralGrade,
        student_id: sid,
        learner_name: learnerName,
        weights,
        hps: {
          ww: hps.ww || [],
          pt: hps.pt || [],
          exams: {
            s1: hps.exams?.s1 ?? "",
            s2: hps.exams?.s2 ?? "",
            te: hps.exams?.te ?? "",
          },
        },
        scores: {
          ww: studentRow.ww,
          pt: studentRow.pt,
        },
        exams: examsView,
        components: {
          ww: {
            total: displayNum(result.ww.total),
            ps: displayNum(result.ww.ps),
            ws: displayNum(result.ww.ws),
          },
          pt: {
            total: displayNum(result.pt.total),
            ps: displayNum(result.pt.ps),
            ws: displayNum(result.pt.ws),
          },
          exams: examsRevealed
            ? {
                ps: displayNum(result.exams.ps),
                ws: displayNum(result.exams.ws),
              }
            : { ps: null, ws: null },
          initial: examsRevealed ? displayNum(result.initial) : null,
          quarterly: examsRevealed ? displayNum(result.quarterly, 0) : null,
        },
        metadata: {
          region: metadata.region || "",
          division: metadata.division || "",
          schoolName: metadata.schoolName || "",
          schoolId: metadata.schoolId || "",
          schoolYear: metadata.schoolYear || sy,
          gradeSection:
            metadata.gradeSection ||
            `Grade ${student.sections?.grade_level ?? student.grade_level ?? "—"} - ${student.sections?.section_name || "—"}`,
          teacher: metadata.teacher || "",
          term: metadata.term || termLabel(recordTerm),
          subject:
            metadata.subject ||
            assignment.subjects?.subject_name ||
            "Subject",
          track: metadata.track || "",
          examRevealDate: metadata.examRevealDate || "",
        },
      });
    }
  }

  rows.sort(
    (a, b) =>
      String(a.subject_name).localeCompare(String(b.subject_name)) ||
      Number(a.term) - Number(b.term)
  );

  return {
    student,
    schoolYear: sy,
    rows,
  };
}

/**
 * Published subject grades only (from grades table + locked class records).
 * No WW / PT / exam component detail — that stays in getStudentSemestralGrades.
 */
export async function getStudentSubjectGrades({
  studentId,
  schoolYear,
} = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { error: "Unauthorized" };

  const sid = String(studentId || "").trim();
  if (!sid) return { error: "Missing student." };

  const admin = createAdminClient();
  const access = await assertCanViewStudentGrades(admin, profile, sid);
  if (access.error) return { error: access.error };

  const sy = schoolYear || SCHOOL_YEAR_DEFAULT;

  const { data: student } = await admin
    .from("students")
    .select(
      "id, section_id, grade_level, lrn, profiles(first_name, last_name), sections(id, section_name, grade_level, school_year)"
    )
    .eq("id", sid)
    .maybeSingle();
  if (!student) return { error: "Student not found." };

  const byKey = new Map();

  // 1) Official grades table
  let gradeRows = [];
  {
    const withSy = await admin
      .from("grades")
      .select(
        "id, subject_id, school_year, quarter, final_transmuted_grade, subjects(subject_name)"
      )
      .eq("student_id", sid)
      .eq("school_year", sy);
    if (!withSy.error) {
      gradeRows = withSy.data || [];
    } else {
      const legacy = await admin
        .from("grades")
        .select(
          "id, subject_id, quarter, final_transmuted_grade, subjects(subject_name)"
        )
        .eq("student_id", sid);
      gradeRows = legacy.data || [];
    }
  }

  for (const g of gradeRows) {
    const term = normalizeGradeTerm(g.quarter ?? 1);
    const grade = Number(g.final_transmuted_grade);
    if (!Number.isFinite(grade)) continue;
    const key = `${g.subject_id || g.subjects?.subject_name}-${term}`;
    byKey.set(key, {
      id: `grade-${g.id || key}`,
      subject_id: g.subject_id,
      subject_name: g.subjects?.subject_name || "Subject",
      school_year: g.school_year || sy,
      term,
      term_label: termLabel(term),
      semestral_grade: grade,
      final_transmuted_grade: grade,
      source: "grades",
    });
  }

  // 2) Locked class records (fill gaps / override with latest locked TG)
  const detail = await getStudentSemestralGrades({ studentId: sid, schoolYear: sy });
  if (!detail.error) {
    for (const row of detail.rows || []) {
      if (row.workflow_status !== GRADE_WORKFLOW.LOCKED) continue;
      if (row.semestral_grade == null) continue;
      const key = `${row.subject_id || row.subject_name}-${row.term}`;
      byKey.set(key, {
        id: `locked-${row.id}`,
        subject_id: row.subject_id,
        subject_name: row.subject_name,
        school_year: row.school_year || sy,
        term: row.term,
        term_label: row.term_label || termLabel(row.term),
        semestral_grade: row.semestral_grade,
        final_transmuted_grade: row.semestral_grade,
        source: "class_record_locked",
      });
    }
  }

  const rows = Array.from(byKey.values()).sort(
    (a, b) =>
      Number(a.term) - Number(b.term) ||
      String(a.subject_name).localeCompare(String(b.subject_name))
  );

  return { student, schoolYear: sy, rows };
}
