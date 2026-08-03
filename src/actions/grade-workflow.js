"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeComponentWeights,
  resolveGradeForClassRecordTerm,
} from "@/lib/class-record";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import {
  GRADE_WORKFLOW,
  canDeptHeadReview,
  canRegistrarLock,
  canSubmitWorkflow,
  canTeacherEditWorkflow,
} from "@/lib/grade-workflow";
import { normalizeGradeTerm, termLabel } from "@/lib/grades-terms";

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return { error: "Unauthorized" };
  return { supabase, user, profile };
}

async function writeAudit(admin, row) {
  await admin.from("grade_audit_logs").insert(row);
}

async function loadClassRecordByAssignmentTerm(admin, assignmentId, term) {
  const recordTerm = normalizeGradeTerm(term);
  const withTerm = await admin
    .from("class_records")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("term", recordTerm)
    .maybeSingle();

  if (!withTerm.error) return { record: withTerm.data, term: recordTerm };

  if (
    String(withTerm.error.message || "")
      .toLowerCase()
      .includes("term")
  ) {
    if (recordTerm !== 1) {
      return {
        error:
          "Run supabase/class-records-term.sql to enable 2nd and Final Semestral class records.",
      };
    }
    const legacy = await admin
      .from("class_records")
      .select("*")
      .eq("assignment_id", assignmentId)
      .maybeSingle();
    return { record: legacy.data, term: 1 };
  }

  return { error: withTerm.error.message };
}

async function publishGradesFromRecord(
  admin,
  { assignment, data, schoolYear, term }
) {
  const hps = data?.hps || {
    ww: [],
    pt: [],
    exams: { s1: "", s2: "", te: "" },
  };
  const weights = normalizeComponentWeights(assignment.subjects || {});
  const studentRows = data?.students || {};
  const recordTerm = normalizeGradeTerm(term);
  const gradeRows = [];

  for (const [studentId, studentRow] of Object.entries(studentRows)) {
    const grade = resolveGradeForClassRecordTerm(
      studentRow,
      hps,
      weights,
      recordTerm
    );
    if (grade == null) continue;
    gradeRows.push({
      student_id: studentId,
      subject_id: assignment.subject_id,
      school_year: schoolYear,
      quarter: recordTerm,
      final_transmuted_grade: grade,
      written_scores: [],
      performance_scores: [],
      assessment_score: null,
    });
  }

  if (!gradeRows.length) {
    return {
      error: `No ${termLabel(recordTerm)} scores to publish. Complete the grade sheet first.`,
    };
  }

  const { error } = await admin.from("grades").upsert(gradeRows, {
    onConflict: "student_id,subject_id,school_year,quarter",
  });
  if (error) return { error: error.message };
  return { ok: true, count: gradeRows.length, term: recordTerm };
}

async function assertDeptHeadCanReviewAssignment(admin, reviewer, assignmentId) {
  const { data: assignment } = await admin
    .from("teacher_assignments")
    .select(
      "id, subject_id, subjects(id, subject_name, department_id, grade_level)"
    )
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) return { error: "Assignment not found." };

  const subject = assignment.subjects || {};
  if (subject.department_id && subject.department_id === reviewer.department_id) {
    return { ok: true, assignment };
  }

  const { data: dept } = await admin
    .from("departments")
    .select("id, name, grade_level")
    .eq("id", reviewer.department_id)
    .maybeSingle();

  if (
    dept &&
    subject.subject_name &&
    String(dept.name).toLowerCase() === String(subject.subject_name).toLowerCase()
  ) {
    return { ok: true, assignment };
  }

  return {
    error:
      "This class record is outside your department. You can only validate grades for your subject department.",
  };
}

function revalidateGradePaths(assignmentId) {
  if (assignmentId) revalidatePath(`/teacher/gradebook/${assignmentId}`);
  revalidatePath("/teacher/gradebook");
  revalidatePath("/teacher/validation");
  revalidatePath("/registrar/grades");
  revalidatePath("/registrar/teachers");
  revalidatePath("/student/grades");
  revalidatePath("/parent/grades");
}

export async function createDepartment(form) {
  const auth = await getAuthContext();
  if (auth.error) return auth;
  if (auth.profile.role !== "registrar") return { error: "Unauthorized" };

  const name = String(form.name || "").trim();
  const band = String(form.band || "jhs").trim();
  const gradeLevel = Number(form.gradeLevel);

  if (!name) return { error: "Department name is required." };
  if (!["jhs", "shs"].includes(band)) {
    return { error: "Select Junior High or Senior High." };
  }
  const allowedGrades = band === "jhs" ? [7, 8, 9, 10] : [11, 12];
  if (!allowedGrades.includes(gradeLevel)) {
    return {
      error:
        band === "jhs"
          ? "Select grade 7, 8, 9, or 10."
          : "Select grade 11 or 12.",
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("departments")
    .insert({
      name,
      band,
      grade_level: gradeLevel,
      description: null,
    })
    .select("id, name, band, grade_level, description")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/registrar/teachers");
  revalidatePath("/registrar/academics");
  return { ok: true, department: data };
}

export async function updateTeacherFacultyAssignment({
  teacherId,
  subjectId,
  band,
  gradeLevel,
  facultyPosition,
  departmentId: legacyDepartmentId,
  facultyDept,
}) {
  const auth = await getAuthContext();
  if (auth.error) return auth;
  if (auth.profile.role !== "registrar") return { error: "Unauthorized" };

  const position = String(facultyPosition || "teacher").trim();
  if (!["teacher", "sub_teacher", "department_head"].includes(position)) {
    return { error: "Invalid faculty position." };
  }

  const admin = createAdminClient();
  let departmentId = legacyDepartmentId || null;
  let subjectName = String(facultyDept || "").trim() || null;
  const resolvedBand = String(band || "").trim();
  const resolvedGrade = Number(gradeLevel);

  if (subjectId) {
    if (!["jhs", "shs"].includes(resolvedBand)) {
      return { error: "Select Junior High or Senior High." };
    }
    const allowedGrades =
      resolvedBand === "jhs" ? [7, 8, 9, 10] : [11, 12];
    if (!allowedGrades.includes(resolvedGrade)) {
      return { error: "Select a valid grade level for this band." };
    }

    const { data: subject, error: subjectError } = await admin
      .from("subjects")
      .select("id, subject_name, grade_level, department_id")
      .eq("id", subjectId)
      .maybeSingle();

    if (subjectError) return { error: subjectError.message };
    if (!subject) return { error: "Subject not found." };
    if (Number(subject.grade_level) !== resolvedGrade) {
      return { error: "Selected subject does not match the grade level." };
    }

    subjectName = subject.subject_name;
    departmentId = subject.department_id || null;

    if (!departmentId) {
      const { data: existingDept } = await admin
        .from("departments")
        .select("id")
        .eq("name", subject.subject_name)
        .eq("band", resolvedBand)
        .eq("grade_level", resolvedGrade)
        .maybeSingle();

      if (existingDept?.id) {
        departmentId = existingDept.id;
      } else {
        const { data: createdDept, error: createError } = await admin
          .from("departments")
          .insert({
            name: subject.subject_name,
            band: resolvedBand,
            grade_level: resolvedGrade,
          })
          .select("id")
          .single();
        if (createError) return { error: createError.message };
        departmentId = createdDept.id;
      }

      await admin
        .from("subjects")
        .update({ department_id: departmentId })
        .eq("id", subject.id);
    }
  }

  const { error } = await admin
    .from("teachers")
    .update({
      department_id: departmentId || null,
      faculty_position: position,
      faculty_dept: subjectName,
    })
    .eq("id", teacherId);

  if (error) return { error: error.message };

  revalidatePath("/registrar/teachers");
  revalidatePath("/teacher");
  revalidatePath("/teacher/validation");
  return { ok: true, departmentId, subjectName };
}

export async function submitClassRecordForReview({
  assignmentId,
  notes,
  term = 1,
}) {
  const auth = await getAuthContext();
  if (auth.error) return auth;
  if (auth.profile.role !== "teacher") return { error: "Unauthorized" };

  const { data: teacher } = await auth.supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", auth.user.id)
    .maybeSingle();
  if (!teacher) return { error: "Teacher account not found." };

  const { data: assignment } = await auth.supabase
    .from("teacher_assignments")
    .select("id")
    .eq("id", assignmentId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();
  if (!assignment) return { error: "Assignment not found." };

  const admin = createAdminClient();
  const loaded = await loadClassRecordByAssignmentTerm(admin, assignmentId, term);
  if (loaded.error) return loaded;
  const record = loaded.record;

  if (!record) {
    return { error: "Save the class record before submitting for review." };
  }
  if (!canSubmitWorkflow(record.workflow_status || GRADE_WORKFLOW.DRAFT)) {
    return {
      error: `Cannot submit while status is "${record.workflow_status}".`,
    };
  }

  const { error } = await admin
    .from("class_records")
    .update({
      workflow_status: GRADE_WORKFLOW.UNDER_REVIEW,
      submitted_at: new Date().toISOString(),
      submitted_by: auth.user.id,
      review_notes: notes ? String(notes).trim() : null,
      reviewed_at: null,
      reviewed_by: null,
    })
    .eq("id", record.id);

  if (error) return { error: error.message };

  await writeAudit(admin, {
    class_record_id: record.id,
    assignment_id: assignmentId,
    actor_id: auth.user.id,
    action: "submit",
    notes: notes || null,
    metadata: {
      from: record.workflow_status,
      to: GRADE_WORKFLOW.UNDER_REVIEW,
      term: loaded.term,
    },
  });

  revalidateGradePaths(assignmentId);
  return { ok: true, term: loaded.term };
}

export async function returnClassRecordToTeacher({
  assignmentId,
  notes,
  term = 1,
}) {
  const auth = await getAuthContext();
  if (auth.error) return auth;
  if (auth.profile.role !== "teacher") return { error: "Unauthorized" };

  const noteText = String(notes || "").trim();
  if (!noteText) {
    return { error: "Add a note explaining why the record is returned." };
  }

  const { data: reviewer } = await auth.supabase
    .from("teachers")
    .select("id, faculty_position, department_id")
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  if (
    reviewer?.faculty_position !== "department_head" ||
    !reviewer.department_id
  ) {
    return {
      error: "Only a department head / committee can return class records.",
    };
  }

  const admin = createAdminClient();
  const access = await assertDeptHeadCanReviewAssignment(
    admin,
    reviewer,
    assignmentId
  );
  if (access.error) return access;

  const loaded = await loadClassRecordByAssignmentTerm(admin, assignmentId, term);
  if (loaded.error) return loaded;
  const record = loaded.record;
  if (!record) return { error: "Class record not found." };
  if (!canDeptHeadReview(record.workflow_status)) {
    return {
      error: `Cannot return while status is "${record.workflow_status}".`,
    };
  }

  const { error } = await admin
    .from("class_records")
    .update({
      workflow_status: GRADE_WORKFLOW.RETURNED,
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user.id,
      review_notes: noteText,
    })
    .eq("id", record.id);

  if (error) return { error: error.message };

  await writeAudit(admin, {
    class_record_id: record.id,
    assignment_id: assignmentId,
    actor_id: auth.user.id,
    action: "return",
    notes: noteText,
    metadata: {
      from: record.workflow_status,
      to: GRADE_WORKFLOW.RETURNED,
      term: loaded.term,
    },
  });

  revalidateGradePaths(assignmentId);
  return { ok: true, term: loaded.term };
}

export async function endorseClassRecord({ assignmentId, notes, term = 1 }) {
  const auth = await getAuthContext();
  if (auth.error) return auth;
  if (auth.profile.role !== "teacher") return { error: "Unauthorized" };

  const { data: reviewer } = await auth.supabase
    .from("teachers")
    .select("id, faculty_position, department_id")
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  if (
    reviewer?.faculty_position !== "department_head" ||
    !reviewer.department_id
  ) {
    return {
      error: "Only a department head / committee can validate class records.",
    };
  }

  const admin = createAdminClient();
  const access = await assertDeptHeadCanReviewAssignment(
    admin,
    reviewer,
    assignmentId
  );
  if (access.error) return access;

  const loaded = await loadClassRecordByAssignmentTerm(admin, assignmentId, term);
  if (loaded.error) return loaded;
  const record = loaded.record;
  if (!record) return { error: "Class record not found." };
  if (!canDeptHeadReview(record.workflow_status)) {
    return {
      error: `Cannot validate while status is "${record.workflow_status}".`,
    };
  }

  const { error } = await admin
    .from("class_records")
    .update({
      workflow_status: GRADE_WORKFLOW.ENDORSED,
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user.id,
      review_notes: notes ? String(notes).trim() : record.review_notes,
    })
    .eq("id", record.id);

  if (error) return { error: error.message };

  await writeAudit(admin, {
    class_record_id: record.id,
    assignment_id: assignmentId,
    actor_id: auth.user.id,
    action: "endorse",
    notes: notes || null,
    metadata: {
      from: record.workflow_status,
      to: GRADE_WORKFLOW.ENDORSED,
      term: loaded.term,
    },
  });

  revalidateGradePaths(assignmentId);
  return { ok: true, term: loaded.term };
}

export async function lockClassRecordGrades({
  assignmentId,
  notes,
  term = 1,
}) {
  const auth = await getAuthContext();
  if (auth.error) return auth;
  if (auth.profile.role !== "registrar") {
    return { error: "Only the registrar can lock and publish grades." };
  }

  const admin = createAdminClient();
  const { data: assignment } = await admin
    .from("teacher_assignments")
    .select(
      "id, subject_id, school_year, sections(school_year), subjects(written_weight, performance_weight, assessment_weight)"
    )
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) return { error: "Assignment not found." };

  const loaded = await loadClassRecordByAssignmentTerm(admin, assignmentId, term);
  if (loaded.error) return loaded;
  const record = loaded.record;

  if (!record) return { error: "Class record not found." };
  if (record.workflow_status === GRADE_WORKFLOW.LOCKED) {
    return { error: "Already locked." };
  }
  if (!canRegistrarLock(record.workflow_status)) {
    return {
      error:
        "Lock only after the department head / committee validates this class record.",
    };
  }

  const schoolYear =
    record.data?.metadata?.schoolYear ||
    assignment.school_year ||
    assignment.sections?.school_year ||
    SCHOOL_YEAR_DEFAULT;

  const published = await publishGradesFromRecord(admin, {
    assignment,
    data: record.data,
    schoolYear,
    term: loaded.term,
  });
  if (published.error) return published;

  const { error } = await admin
    .from("class_records")
    .update({
      workflow_status: GRADE_WORKFLOW.LOCKED,
      locked_at: new Date().toISOString(),
      locked_by: auth.user.id,
      review_notes: notes ? String(notes).trim() : record.review_notes,
    })
    .eq("id", record.id);

  if (error) return { error: error.message };

  await writeAudit(admin, {
    class_record_id: record.id,
    assignment_id: assignmentId,
    actor_id: auth.user.id,
    action: "lock",
    notes: notes || null,
    metadata: {
      from: record.workflow_status,
      to: GRADE_WORKFLOW.LOCKED,
      publishedRows: published.count,
      term: loaded.term,
    },
  });

  revalidateGradePaths(assignmentId);
  return { ok: true, term: loaded.term };
}

export async function unlockClassRecordGrades({
  assignmentId,
  notes,
  term = 1,
}) {
  const auth = await getAuthContext();
  if (auth.error) return auth;
  if (auth.profile.role !== "registrar") {
    return { error: "Only the registrar can unlock grades." };
  }

  const noteText = String(notes || "").trim();
  if (!noteText) return { error: "Add a reason for unlocking." };

  const admin = createAdminClient();
  const loaded = await loadClassRecordByAssignmentTerm(admin, assignmentId, term);
  if (loaded.error) return loaded;
  const record = loaded.record;

  if (!record) return { error: "Class record not found." };
  if (record.workflow_status !== GRADE_WORKFLOW.LOCKED) {
    return { error: "Record is not locked." };
  }

  const { error } = await admin
    .from("class_records")
    .update({
      workflow_status: GRADE_WORKFLOW.ENDORSED,
      locked_at: null,
      locked_by: null,
      review_notes: noteText,
    })
    .eq("id", record.id);

  if (error) return { error: error.message };

  await writeAudit(admin, {
    class_record_id: record.id,
    assignment_id: assignmentId,
    actor_id: auth.user.id,
    action: "unlock",
    notes: noteText,
    metadata: {
      from: GRADE_WORKFLOW.LOCKED,
      to: GRADE_WORKFLOW.ENDORSED,
      term: loaded.term,
    },
  });

  revalidateGradePaths(assignmentId);
  return { ok: true, term: loaded.term };
}

export { canTeacherEditWorkflow };
