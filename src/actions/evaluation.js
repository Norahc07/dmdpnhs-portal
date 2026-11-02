"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import {
  averageFromScores,
  computeStudentTermCompletion,
  currentEvaluationTerm,
  isPriorGradeTerm,
  questionsFor,
  resolveStudentGradeGateTerm,
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

    const sectionIds = sections.map((s) => s.sectionId).filter(Boolean);
    let learners = [];
    if (sectionIds.length) {
      const { data: studentRows } = await admin
        .from("students")
        .select("id, lrn, section_id, profiles(first_name, last_name)")
        .in("section_id", sectionIds)
        .eq("activation_status", "active");
      const sectionById = new Map(sections.map((s) => [s.sectionId, s]));
      learners = (studentRows || [])
        .map((row) => {
          const section = sectionById.get(row.section_id);
          return {
            studentId: row.id,
            lrn: row.lrn || "—",
            name: [row.profiles?.last_name, row.profiles?.first_name]
              .filter(Boolean)
              .join(", ") || "Learner",
            sectionId: row.section_id,
            sectionName: section?.sectionName || "Section",
            gradeLevel: section?.gradeLevel,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
      role: "teacher",
      schoolYear,
      teacher,
      sections,
      learners,
    };
  }

  return { error: "Evaluation is for students and teachers." };
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
 * Prior terms are always unlocked. The active term requires a one-time
 * system + self + subject-teacher evaluation before grades for that term open.
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

  const { data: student } = await admin
    .from("students")
    .select("id, section_id, current_term")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!student) return { error: "Student record not found." };

  const activeTerm = resolveStudentGradeGateTerm(student);
  const termNum = Number(term) || activeTerm;

  // Finished / previous terms stay readable without re-evaluating.
  if (isPriorGradeTerm(termNum, activeTerm)) {
    return {
      unlocked: true,
      priorTerm: true,
      activeTerm,
      progress: null,
      schoolYear: sy,
      term: termNum,
      tableMissing: false,
      evaluationHref: `/student/evaluation?term=${activeTerm}`,
    };
  }

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
        priorTerm: false,
        activeTerm,
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
    priorTerm: false,
    activeTerm,
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
  if (role === "teacher") {
    return {
      error: "Teacher evaluation forms are no longer available.",
    };
  }
  if (role !== "student") {
    return { error: "Unauthorized role." };
  }

  const type = String(evaluationType || "").trim();
  const allowed = ["system", "teacher", "self"];
  if (!allowed.includes(type)) {
    return { error: "Invalid evaluation type." };
  }

  let termNum = Number(term);
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
    if (type === "student") {
      if (!targetStudentId) return { error: "Choose a learner to evaluate." };
      const { data: target } = await admin
        .from("students")
        .select("id, section_id")
        .eq("id", targetStudentId)
        .maybeSingle();
      if (!target) return { error: "Learner not found." };
      const { data: assignments } = await admin
        .from("teacher_assignments")
        .select("section_id")
        .eq("teacher_id", teacher.id)
        .eq("school_year", sy);
      const { data: advisory } = await admin
        .from("sections")
        .select("id")
        .eq("adviser_id", teacher.id);
      const allowedSections = new Set([
        ...(assignments || []).map((row) => row.section_id),
        ...(advisory || []).map((row) => row.id),
      ]);
      if (!allowedSections.has(target.section_id)) {
        return { error: "You can only evaluate learners in your sections." };
      }
      studentId = target.id;
      sectionId = target.section_id;
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
  } else if (type === "student") {
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
  if (type === "teacher" && teacherId) {
    revalidatePath("/teacher/evaluation");
  }
  return { ok: true, average };
}

/**
 * Teacher read-only: anonymous student ratings of this teacher (per subject/term).
 * Students must complete these before term grades unlock.
 */
export async function listTeacherReceivedEvaluations({
  schoolYear,
  term,
} = {}) {
  const auth = await getAuth();
  if (auth.error) return { error: auth.error };
  if (auth.profile.role !== "teacher") {
    return { error: "Teachers only." };
  }

  const { admin, profile } = auth;
  const sy = schoolYear || SCHOOL_YEAR_DEFAULT;
  const termNum = term != null && term !== "" ? Number(term) : null;

  const { data: teacher } = await admin
    .from("teachers")
    .select("id, teacher_id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!teacher?.id) return { error: "Teacher record not found." };

  let query = admin
    .from("evaluations")
    .select(
      `
      id,
      school_year,
      term,
      evaluation_type,
      target_teacher_id,
      target_subject_id,
      target_section_id,
      scores,
      average_score,
      comments,
      updated_at,
      subjects ( id, subject_name ),
      sections ( id, section_name, grade_level )
    `
    )
    .eq("evaluator_role", "student")
    .eq("evaluation_type", "teacher")
    .eq("target_teacher_id", teacher.id)
    .eq("school_year", sy)
    .order("updated_at", { ascending: false });

  if ([1, 2, 3].includes(termNum)) {
    query = query.eq("term", termNum);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) {
      return { tableMissing: true, rows: [], summary: null, teacher };
    }
    // Fallback without embeds if relationship names differ
    if (/subjects|sections|relationship/i.test(error.message || "")) {
      let plain = admin
        .from("evaluations")
        .select(
          "id, school_year, term, evaluation_type, target_teacher_id, target_subject_id, target_section_id, scores, average_score, comments, updated_at"
        )
        .eq("evaluator_role", "student")
        .eq("evaluation_type", "teacher")
        .eq("target_teacher_id", teacher.id)
        .eq("school_year", sy)
        .order("updated_at", { ascending: false });
      if ([1, 2, 3].includes(termNum)) plain = plain.eq("term", termNum);
      const retry = await plain;
      if (retry.error) return { error: retry.error.message };
      const subjectIds = [
        ...new Set(
          (retry.data || []).map((r) => r.target_subject_id).filter(Boolean)
        ),
      ];
      const sectionIds = [
        ...new Set(
          (retry.data || []).map((r) => r.target_section_id).filter(Boolean)
        ),
      ];
      const [{ data: subjects }, { data: sections }] = await Promise.all([
        subjectIds.length
          ? admin
              .from("subjects")
              .select("id, subject_name")
              .in("id", subjectIds)
          : Promise.resolve({ data: [] }),
        sectionIds.length
          ? admin
              .from("sections")
              .select("id, section_name, grade_level")
              .in("id", sectionIds)
          : Promise.resolve({ data: [] }),
      ]);
      const subjectById = Object.fromEntries(
        (subjects || []).map((s) => [s.id, s])
      );
      const sectionById = Object.fromEntries(
        (sections || []).map((s) => [s.id, s])
      );
      const rows = (retry.data || []).map((row) => ({
        ...row,
        subjects: subjectById[row.target_subject_id] || null,
        sections: sectionById[row.target_section_id] || null,
      }));
      return buildTeacherReceivedPayload(rows, teacher, sy, termNum);
    }
    return { error: error.message };
  }

  return buildTeacherReceivedPayload(data || [], teacher, sy, termNum);
}

function buildTeacherReceivedPayload(rows, teacher, schoolYear, term) {
  const vals = rows
    .map((r) => Number(r.average_score))
    .filter((n) => Number.isFinite(n));
  const overallAverage = vals.length
    ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
    : null;

  const bySubject = new Map();
  for (const row of rows) {
    const name = row.subjects?.subject_name || "Subject";
    const key = row.target_subject_id || name;
    if (!bySubject.has(key)) {
      bySubject.set(key, { subjectName: name, count: 0, sum: 0 });
    }
    const bucket = bySubject.get(key);
    bucket.count += 1;
    const avg = Number(row.average_score);
    if (Number.isFinite(avg)) bucket.sum += avg;
  }

  const subjectBreakdown = Array.from(bySubject.values())
    .map((b) => ({
      subjectName: b.subjectName,
      count: b.count,
      average:
        b.count > 0
          ? Math.round((b.sum / b.count) * 100) / 100
          : null,
    }))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  return {
    tableMissing: false,
    teacher,
    schoolYear,
    term,
    rows,
    summary: {
      count: rows.length,
      overallAverage,
      subjectBreakdown,
    },
  };
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
    studentSelf: rows.filter(
      (r) => r.evaluator_role === "student" && r.evaluation_type === "self"
    ),
    teacherStudent: rows.filter(
      (r) => r.evaluator_role === "teacher" && r.evaluation_type === "student"
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
      studentSelf: { count: by.studentSelf.length, average: avg(by.studentSelf) },
      teacherStudent: {
        count: by.teacherStudent.length,
        average: avg(by.teacherStudent),
      },
      total: rows.length,
    },
  };
}
