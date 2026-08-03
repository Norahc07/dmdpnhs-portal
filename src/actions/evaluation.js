"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import {
  averageFromScores,
  computeStudentTermCompletion,
  currentEvaluationTerm,
  questionsFor,
  TEACHER_YEAR_END_TERM,
} from "@/lib/evaluation";

async function getAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found" };
  return { supabase, user, profile, admin: createAdminClient() };
}

function isMissingTable(error) {
  const msg = String(error?.message || "");
  return /evaluations/i.test(msg) && /does not exist|schema cache|Could not find/i.test(msg);
}

/** Subject teachers for a student's section (assignments + class schedules). */
async function loadStudentSectionTeachers(admin, sectionId, schoolYear) {
  if (!sectionId) return [];

  const byKey = new Map();

  const { data: assignments } = await admin
    .from("teacher_assignments")
    .select(
      `
      id, teacher_id, subject_id, school_year,
      teachers ( id, profiles ( first_name, last_name ) ),
      subjects ( id, subject_name )
    `
    )
    .eq("section_id", sectionId)
    .eq("school_year", schoolYear);

  for (const a of assignments || []) {
    if (!a.teacher_id || !a.subject_id) continue;
    const key = `${a.teacher_id}::${a.subject_id}`;
    byKey.set(key, {
      assignmentId: a.id,
      teacherId: a.teacher_id,
      subjectId: a.subject_id,
      subjectName: a.subjects?.subject_name || "Subject",
      teacherName: [
        a.teachers?.profiles?.last_name,
        a.teachers?.profiles?.first_name,
      ]
        .filter(Boolean)
        .join(", "),
    });
  }

  const { data: schedules } = await admin
    .from("class_schedules")
    .select(
      `
      subject_id,
      teacher_id,
      subjects ( id, subject_name ),
      teachers ( id, profiles ( first_name, last_name ) )
    `
    )
    .eq("section_id", sectionId);

  for (const row of schedules || []) {
    const teacherId = row.teacher_id || row.teachers?.id;
    const subjectId = row.subject_id || row.subjects?.id;
    if (!teacherId || !subjectId) continue;
    const key = `${teacherId}::${subjectId}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      assignmentId: null,
      teacherId,
      subjectId,
      subjectName: row.subjects?.subject_name || "Subject",
      teacherName: [
        row.teachers?.profiles?.last_name,
        row.teachers?.profiles?.first_name,
      ]
        .filter(Boolean)
        .join(", "),
    });
  }

  return Array.from(byKey.values()).sort((a, b) =>
    String(a.subjectName).localeCompare(String(b.subjectName))
  );
}

export async function getEvaluationContext() {
  const auth = await getAuth();
  if (auth.error) return { error: auth.error };
  const { profile, admin } = auth;
  const schoolYear = SCHOOL_YEAR_DEFAULT;

  if (profile.role === "student") {
    const { data: student } = await admin
      .from("students")
      .select("id, lrn, section_id, grade_level, status, activation_status")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (!student) return { error: "Student record not found." };

    const teachers = await loadStudentSectionTeachers(
      admin,
      student.section_id,
      schoolYear
    );

    return {
      role: "student",
      schoolYear,
      student,
      teachers,
      lrn: student.lrn,
    };
  }

  if (profile.role === "teacher") {
    const { data: teacher } = await admin
      .from("teachers")
      .select("id, teacher_id")
      .eq("profile_id", profile.id)
      .maybeSingle();

    const { data: assignments } = teacher?.id
      ? await admin
          .from("teacher_assignments")
          .select(
            "id, section_id, subject_id, sections(id, section_name, grade_level, adviser_id), subjects(subject_name)"
          )
          .eq("teacher_id", teacher.id)
          .eq("school_year", schoolYear)
      : { data: [] };

    const { data: advisory } = teacher?.id
      ? await admin
          .from("sections")
          .select("id, section_name, grade_level, school_year")
          .eq("adviser_id", teacher.id)
          .eq("school_year", schoolYear)
      : { data: [] };

    const sectionMap = new Map();
    for (const a of assignments || []) {
      const s = a.sections;
      if (!s?.id && !a.section_id) continue;
      const sectionId = a.section_id || s.id;
      const existing = sectionMap.get(sectionId) || {
        assignmentId: a.id,
        sectionId,
        sectionName: s?.section_name,
        gradeLevel: s?.grade_level,
        isAdvisory: s?.adviser_id === teacher.id,
        subjects: [],
      };
      if (a.subjects?.subject_name) {
        if (!existing.subjects.includes(a.subjects.subject_name)) {
          existing.subjects.push(a.subjects.subject_name);
        }
      }
      if (!existing.assignmentId) existing.assignmentId = a.id;
      sectionMap.set(sectionId, existing);
    }
    for (const s of advisory || []) {
      const existing = sectionMap.get(s.id) || {
        assignmentId: null,
        sectionId: s.id,
        sectionName: s.section_name,
        gradeLevel: s.grade_level,
        isAdvisory: true,
        subjects: [],
      };
      existing.isAdvisory = true;
      sectionMap.set(s.id, existing);
    }

    const sections = Array.from(sectionMap.values()).sort((a, b) => {
      const g = (a.gradeLevel || 0) - (b.gradeLevel || 0);
      if (g !== 0) return g;
      return String(a.sectionName || "").localeCompare(String(b.sectionName || ""));
    });

    return {
      role: "teacher",
      schoolYear,
      teacher,
      sections,
    };
  }

  if (profile.role === "parent") {
    const { data: parent } = await admin
      .from("parents")
      .select("id, access_code")
      .eq("profile_id", profile.id)
      .maybeSingle();

    const { data: links } = parent?.id
      ? await admin
          .from("parent_student_links")
          .select(
            "student_id, students(id, lrn, grade_level, profiles(first_name, last_name))"
          )
          .eq("parent_id", parent.id)
      : { data: [] };

    return {
      role: "parent",
      schoolYear,
      parent,
      children: (links || []).map((l) => l.students).filter(Boolean),
    };
  }

  return { error: "Evaluation is for students, teachers, and parents." };
}

export async function listMyEvaluations({ schoolYear, term } = {}) {
  const auth = await getAuth();
  if (auth.error) return { error: auth.error };
  const { admin, profile } = auth;
  const sy = schoolYear || SCHOOL_YEAR_DEFAULT;

  let query = admin
    .from("evaluations")
    .select(
      "id, school_year, term, evaluation_type, target_teacher_id, target_subject_id, target_section_id, student_id, scores, average_score, comments, updated_at"
    )
    .eq("evaluator_profile_id", profile.id)
    .eq("school_year", sy)
    .order("updated_at", { ascending: false });

  if (term) query = query.eq("term", Number(term));

  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) {
      return { evaluations: [], tableMissing: true };
    }
    return { error: error.message };
  }
  return { evaluations: data || [], tableMissing: false };
}

/**
 * Whether a student may view official grades for a school year + term.
 * Requires system eval + all section teachers evaluated for that term.
 */
export async function getStudentGradesUnlockStatus({
  schoolYear,
  term,
} = {}) {
  const auth = await getAuth();
  if (auth.error) return { error: auth.error };
  if (auth.profile.role !== "student") {
    return { error: "Students only" };
  }

  const { profile, admin } = auth;
  const sy = schoolYear || SCHOOL_YEAR_DEFAULT;
  const termNum = Number(term) || currentEvaluationTerm();

  const { data: student } = await admin
    .from("students")
    .select("id, section_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!student) return { error: "Student record not found." };

  const teachers = await loadStudentSectionTeachers(
    admin,
    student.section_id,
    sy
  );

  const { data: evaluations, error: evalError } = await admin
    .from("evaluations")
    .select(
      "id, school_year, term, evaluation_type, target_teacher_id, target_subject_id"
    )
    .eq("evaluator_profile_id", profile.id)
    .eq("school_year", sy)
    .eq("term", termNum);

  if (evalError) {
    if (isMissingTable(evalError)) {
      return {
        unlocked: false,
        progress: computeStudentTermCompletion({
          teachers,
          evaluations: [],
          term: termNum,
          schoolYear: sy,
        }),
        schoolYear: sy,
        term: termNum,
        tableMissing: true,
        evaluationHref: `/student/evaluation?term=${termNum}`,
      };
    }
    return { error: evalError.message };
  }

  const progress = computeStudentTermCompletion({
    teachers,
    evaluations: evaluations || [],
    term: termNum,
    schoolYear: sy,
  });

  return {
    unlocked: progress.complete,
    progress,
    schoolYear: sy,
    term: termNum,
    tableMissing: false,
    evaluationHref: `/student/evaluation?term=${termNum}`,
  };
}

export async function submitEvaluation({
  evaluationType,
  term,
  schoolYear,
  scores,
  comments,
  targetTeacherId,
  targetSubjectId,
  targetSectionId,
  targetStudentId,
}) {
  const auth = await getAuth();
  if (auth.error) return { error: auth.error };
  const { admin, profile } = auth;

  const role = profile.role;
  if (!["student", "teacher", "parent"].includes(role)) {
    return { error: "Unauthorized role." };
  }

  const type = String(evaluationType || "").trim();
  const allowed = ["system", "teacher", "section", "child"];
  if (!allowed.includes(type)) {
    return { error: "Invalid evaluation type." };
  }
  if (type === "teacher" && role !== "student") {
    return { error: "Only students evaluate teachers." };
  }
  if (type === "section" && role !== "teacher") {
    return { error: "Only teachers evaluate their sections." };
  }
  if (type === "child" && role !== "parent") {
    return { error: "Only parents evaluate linked children." };
  }

  let termNum = Number(term);
  if (role === "teacher") {
    termNum = TEACHER_YEAR_END_TERM;
  }
  if (![1, 2, 3].includes(termNum)) return { error: "Choose a valid term." };
  const sy = schoolYear || SCHOOL_YEAR_DEFAULT;

  const questions = questionsFor(role, type);
  const cleanScores = {};
  for (const q of questions) {
    const n = Number(scores?.[q.id]);
    if (!Number.isFinite(n) || n < 1 || n > 5) {
      return { error: `Please rate all items (missing: ${q.id}).` };
    }
    cleanScores[q.id] = n;
  }
  const average = averageFromScores(cleanScores, questions);

  let studentId = null;
  let parentId = null;
  let sectionId = null;
  let teacherId = null;
  let subjectId = null;

  if (role === "student") {
    const { data: student } = await admin
      .from("students")
      .select("id, section_id, activation_status")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (!student) return { error: "Student record not found." };
    if (student.activation_status !== "active") {
      return { error: "Activate your portal before submitting evaluations." };
    }
    studentId = student.id;
    if (type === "teacher") {
      if (!targetTeacherId || !targetSubjectId) {
        return { error: "Choose a teacher/subject to evaluate." };
      }
      teacherId = targetTeacherId;
      subjectId = targetSubjectId;
      sectionId = student.section_id;
    }
  }

  if (role === "teacher") {
    const { data: teacher } = await admin
      .from("teachers")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (!teacher) return { error: "Teacher record not found." };
    if (type === "section") {
      if (!targetSectionId) return { error: "Choose a section to evaluate." };
      sectionId = targetSectionId;
    }
  }

  if (role === "parent") {
    const { data: parent } = await admin
      .from("parents")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (!parent) return { error: "Parent record not found." };
    parentId = parent.id;
    if (type === "child") {
      if (!targetStudentId) return { error: "Choose a child to evaluate." };
      // Verify link
      const { data: link } = await admin
        .from("parent_student_links")
        .select("id")
        .eq("parent_id", parent.id)
        .eq("student_id", targetStudentId)
        .maybeSingle();
      if (!link) return { error: "That learner is not linked to your account." };
      studentId = targetStudentId;
    }
  }

  const payload = {
    school_year: sy,
    term: termNum,
    evaluator_role: role,
    evaluator_profile_id: profile.id,
    evaluation_type: type,
    target_teacher_id: teacherId,
    target_subject_id: subjectId,
    target_section_id: sectionId,
    student_id: studentId,
    parent_id: parentId,
    scores: cleanScores,
    average_score: average,
    comments: comments ? String(comments).trim() || null : null,
    updated_at: new Date().toISOString(),
  };

  let existingQuery = admin
    .from("evaluations")
    .select("id")
    .eq("evaluator_profile_id", profile.id)
    .eq("school_year", sy)
    .eq("term", termNum)
    .eq("evaluation_type", type)
    .limit(1);

  if (type === "teacher") {
    existingQuery = existingQuery
      .eq("target_teacher_id", teacherId)
      .eq("target_subject_id", subjectId);
  } else if (type === "section") {
    existingQuery = existingQuery.eq("target_section_id", sectionId);
  } else if (type === "child") {
    existingQuery = existingQuery.eq("student_id", studentId);
  }

  const { data: existingRows, error: findErr } = await existingQuery;
  if (findErr && isMissingTable(findErr)) {
    return {
      error:
        "Evaluations table is missing. Run supabase/evaluations-upgrade.sql in Supabase.",
    };
  }
  if (findErr) return { error: findErr.message };

  const existingId = existingRows?.[0]?.id;
  let error;
  if (existingId) {
    ({ error } = await admin
      .from("evaluations")
      .update(payload)
      .eq("id", existingId));
  } else {
    ({ error } = await admin.from("evaluations").insert(payload));
  }

  if (error) {
    if (isMissingTable(error)) {
      return {
        error:
          "Evaluations table is missing. Run supabase/evaluations-upgrade.sql (and evaluations-v2-types.sql) in Supabase.",
      };
    }
    return { error: error.message };
  }

  revalidatePath(`/${role}/evaluation`);
  revalidatePath("/student/grades");
  revalidatePath("/registrar/evaluation");
  return { ok: true, average };
}

/** Registrar read-only summary counts */
export async function getEvaluationSummary({ schoolYear, term } = {}) {
  const auth = await getAuth();
  if (auth.error) return { error: auth.error };
  if (auth.profile.role !== "registrar") return { error: "Registrar only" };

  const sy = schoolYear || SCHOOL_YEAR_DEFAULT;
  const termNum = term ? Number(term) : null;

  let query = auth.admin
    .from("evaluations")
    .select(
      "id, evaluator_role, evaluation_type, average_score, school_year, term"
    )
    .eq("school_year", sy);

  if (termNum) query = query.eq("term", termNum);

  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) {
      return { tableMissing: true, rows: [], summary: null };
    }
    return { error: error.message };
  }

  const rows = data || [];
  const by = {
    studentSystem: rows.filter(
      (r) => r.evaluator_role === "student" && r.evaluation_type === "system"
    ),
    studentTeacher: rows.filter(
      (r) => r.evaluator_role === "student" && r.evaluation_type === "teacher"
    ),
    teacherSystem: rows.filter(
      (r) => r.evaluator_role === "teacher" && r.evaluation_type === "system"
    ),
    teacherSection: rows.filter(
      (r) => r.evaluator_role === "teacher" && r.evaluation_type === "section"
    ),
    parentSystem: rows.filter(
      (r) => r.evaluator_role === "parent" && r.evaluation_type === "system"
    ),
    parentChild: rows.filter(
      (r) => r.evaluator_role === "parent" && r.evaluation_type === "child"
    ),
  };

  function avg(list) {
    const vals = list
      .map((r) => Number(r.average_score))
      .filter((n) => Number.isFinite(n));
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  }

  return {
    tableMissing: false,
    rows,
    summary: {
      studentSystem: { count: by.studentSystem.length, average: avg(by.studentSystem) },
      studentTeacher: {
        count: by.studentTeacher.length,
        average: avg(by.studentTeacher),
      },
      teacherSystem: { count: by.teacherSystem.length, average: avg(by.teacherSystem) },
      teacherSection: {
        count: by.teacherSection.length,
        average: avg(by.teacherSection),
      },
      parentSystem: { count: by.parentSystem.length, average: avg(by.parentSystem) },
      parentChild: { count: by.parentChild.length, average: avg(by.parentChild) },
      total: rows.length,
    },
  };
}
