"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeComponentWeights,
  resolveTermGrades,
} from "@/lib/class-record";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import {
  GRADE_WORKFLOW,
  canDeptHeadReview,
  canRegistrarLock,
  canSubmitWorkflow,
  canTeacherEditWorkflow,
} from "@/lib/grade-workflow";
import { GRADE_TERMS } from "@/lib/grades-terms";

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

async function publishGradesFromRecord(admin, { assignment, data, schoolYear }) {
  const hps = data?.hps || {
    ww: [],
    pt: [],
    exams: { s1: "", s2: "", te: "" },
  };
  const weights = normalizeComponentWeights(assignment.subjects || {});
  const studentRows = data?.students || {};
  const gradeRows = [];

  for (const [studentId, studentRow] of Object.entries(studentRows)) {
    const { term1, term2, finalTerm } = resolveTermGrades(
      studentRow,
      hps,
      weights
    );
    const byTerm = { 1: term1, 2: term2, 3: finalTerm };
    for (const term of GRADE_TERMS) {
      const grade = byTerm[term.value];
      if (grade == null) continue;
      gradeRows.push({
        student_id: studentId,
        subject_id: assignment.subject_id,
        school_year: schoolYear,
        quarter: term.value,
        final_transmuted_grade: grade,
        written_scores: [],
        performance_scores: [],
        assessment_score: null,
      });
    }
  }

  if (!gradeRows.length) {
    return { error: "No term grades to publish. Complete term scores first." };
  }

  const { error } = await admin.from("grades").upsert(gradeRows, {
    onConflict: "student_id,subject_id,school_year,quarter",
  });
  if (error) return { error: error.message };
  return { ok: true, count: gradeRows.length };
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
  const description = String(form.description || "").trim() || null;
  if (!name) return { error: "Department name is required." };
  if (!["jhs", "shs", "all"].includes(band)) {
    return { error: "Select a valid department band." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("departments").insert({
    name,
    band,
    description,
  });
  if (error) return { error: error.message };

  revalidatePath("/registrar/teachers");
  revalidatePath("/registrar/academics");
  return { ok: true };
}

export async function updateTeacherFacultyAssignment({
  teacherId,
  departmentId,
  facultyPosition,
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
  const { error } = await admin
    .from("teachers")
    .update({
      department_id: departmentId || null,
      faculty_position: position,
      faculty_dept: String(facultyDept || "").trim() || null,
    })
    .eq("id", teacherId);

  if (error) return { error: error.message };

  revalidatePath("/registrar/teachers");
  revalidatePath("/teacher");
  revalidatePath("/teacher/validation");
  return { ok: true };
}

export async function submitClassRecordForReview({ assignmentId, notes }) {
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
  const { data: record } = await admin
    .from("class_records")
    .select("id, workflow_status, data")
    .eq("assignment_id", assignmentId)
    .maybeSingle();

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
      workflow_status: GRADE_WORKFLOW.SUBMITTED,
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
    metadata: { from: record.workflow_status, to: GRADE_WORKFLOW.SUBMITTED },
  });

  revalidateGradePaths(assignmentId);
  return { ok: true };
}

export async function returnClassRecordToTeacher({
  assignmentId,
  notes,
}) {
  const auth = await getAuthContext();
  if (auth.error) return auth;

  const admin = createAdminClient();
  const gate = await assertCanReviewAssignment(auth, admin, assignmentId);
  if (gate.error) return gate;

  const { record } = gate;
  if (!canDeptHeadReview(record.workflow_status) && auth.profile.role !== "registrar") {
    return { error: "This class record is not awaiting review." };
  }
  if (record.workflow_status === GRADE_WORKFLOW.LOCKED) {
    return { error: "Locked grades cannot be returned. Unlock first." };
  }

  const noteText = String(notes || "").trim();
  if (!noteText) return { error: "Add a note explaining what to correct." };

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
    metadata: { from: record.workflow_status, to: GRADE_WORKFLOW.RETURNED },
  });

  revalidateGradePaths(assignmentId);
  return { ok: true };
}

export async function endorseClassRecord({ assignmentId, notes }) {
  const auth = await getAuthContext();
  if (auth.error) return auth;

  const admin = createAdminClient();
  const gate = await assertCanReviewAssignment(auth, admin, assignmentId);
  if (gate.error) return gate;

  const { record } = gate;
  if (!canDeptHeadReview(record.workflow_status) && auth.profile.role !== "registrar") {
    return { error: "This class record is not awaiting review." };
  }
  if (record.workflow_status === GRADE_WORKFLOW.LOCKED) {
    return { error: "Already locked." };
  }

  // Mark under_review then endorse (committee check complete)
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
    metadata: { from: record.workflow_status, to: GRADE_WORKFLOW.ENDORSED },
  });

  revalidateGradePaths(assignmentId);
  return { ok: true };
}

export async function lockClassRecordGrades({ assignmentId, notes }) {
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

  const { data: record } = await admin
    .from("class_records")
    .select("*")
    .eq("assignment_id", assignmentId)
    .maybeSingle();

  if (!record) return { error: "Class record not found." };
  if (record.workflow_status === GRADE_WORKFLOW.LOCKED) {
    return { error: "Already locked." };
  }
  if (!canRegistrarLock(record.workflow_status) && record.workflow_status !== GRADE_WORKFLOW.ENDORSED) {
    // Allow lock from endorsed; also allow submitted if no dept head yet (fallback)
    if (record.workflow_status !== GRADE_WORKFLOW.SUBMITTED && record.workflow_status !== GRADE_WORKFLOW.ENDORSED) {
      return {
        error:
          "Lock only after department head endorsement (or submitted if no head assigned).",
      };
    }
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
    },
  });

  revalidateGradePaths(assignmentId);
  return { ok: true };
}

export async function unlockClassRecordGrades({ assignmentId, notes }) {
  const auth = await getAuthContext();
  if (auth.error) return auth;
  if (auth.profile.role !== "registrar") {
    return { error: "Only the registrar can unlock grades." };
  }

  const noteText = String(notes || "").trim();
  if (!noteText) return { error: "Add a reason for unlocking." };

  const admin = createAdminClient();
  const { data: record } = await admin
    .from("class_records")
    .select("id, workflow_status")
    .eq("assignment_id", assignmentId)
    .maybeSingle();

  if (!record) return { error: "Class record not found." };
  if (record.workflow_status !== GRADE_WORKFLOW.LOCKED) {
    return { error: "Record is not locked." };
  }

  const { error } = await admin
    .from("class_records")
    .update({
      workflow_status: GRADE_WORKFLOW.RETURNED,
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
    metadata: { from: GRADE_WORKFLOW.LOCKED, to: GRADE_WORKFLOW.RETURNED },
  });

  revalidateGradePaths(assignmentId);
  return { ok: true };
}

async function assertCanReviewAssignment(auth, admin, assignmentId) {
  if (auth.profile.role === "registrar") {
    const { data: record } = await admin
      .from("class_records")
      .select("*")
      .eq("assignment_id", assignmentId)
      .maybeSingle();
    if (!record) return { error: "Class record not found." };
    return { record };
  }

  if (auth.profile.role !== "teacher") return { error: "Unauthorized" };

  const { data: reviewer } = await admin
    .from("teachers")
    .select("id, department_id, faculty_position")
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  if (!reviewer) return { error: "Teacher account not found." };
  if (reviewer.faculty_position !== "department_head") {
    return {
      error: "Only department heads (or the registrar) can validate grades.",
    };
  }
  if (!reviewer.department_id) {
    return { error: "You are not assigned to a department yet." };
  }

  const { data: assignment } = await admin
    .from("teacher_assignments")
    .select(
      "id, teacher_id, teachers!inner(id, department_id)"
    )
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) return { error: "Assignment not found." };
  if (assignment.teachers?.department_id !== reviewer.department_id) {
    return {
      error: "You can only validate grades within your department.",
    };
  }

  const { data: record } = await admin
    .from("class_records")
    .select("*")
    .eq("assignment_id", assignmentId)
    .maybeSingle();

  if (!record) return { error: "Class record not found." };

  // Own class records: dept head shouldn't endorse their own as sole check —
  // still allow but registrar lock remains required.
  return { record, reviewer };
}

export { canTeacherEditWorkflow };
