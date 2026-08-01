"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeComponentWeights } from "@/lib/class-record";
import { computeDepEdGrade } from "@/lib/deped-grades";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import {
  GRADE_WORKFLOW,
  canTeacherEditWorkflow,
} from "@/lib/grade-workflow";

export async function updateSubjectWeights({
  subjectId,
  writtenWeight,
  performanceWeight,
  assessmentWeight,
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return { error: "Unauthorized" };

  const weights = normalizeComponentWeights({
    writtenWeight,
    performanceWeight,
    assessmentWeight,
  });

  if (weights.written + weights.performance + weights.assessment !== 100) {
    return { error: "Written + Performance + Exam weights must total 100." };
  }

  if (!subjectId) return { error: "Subject is required." };

  if (profile.role === "teacher") {
    const { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();
    if (!teacher) return { error: "Teacher account not found." };

    const { data: assignment } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("teacher_id", teacher.id)
      .eq("subject_id", subjectId)
      .limit(1)
      .maybeSingle();

    if (!assignment) {
      return {
        error: "You can only edit weights for subjects assigned to you.",
      };
    }
  } else if (profile.role !== "registrar") {
    return { error: "Only registrars and assigned teachers can edit weights." };
  }

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("subjects")
    .update({
      written_weight: weights.written,
      performance_weight: weights.performance,
      assessment_weight: weights.assessment,
    })
    .eq("id", subjectId)
    .select("id, subject_name, written_weight, performance_weight, assessment_weight")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!updated) return { error: "Subject not found." };

  revalidatePath("/registrar/academics");
  revalidatePath("/teacher/gradebook", "layout");
  revalidatePath("/registrar/forms");
  return { ok: true, subject: updated, weights };
}

export async function saveGradeRecord({
  gradeId,
  studentId,
  subjectId,
  quarter,
  schoolYear,
  writtenScores,
  performanceScores,
  assessmentScore,
  weights,
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const computed = computeDepEdGrade({
    writtenScores,
    performanceScores,
    assessmentScore,
    writtenWeight: weights?.writtenWeight ?? 40,
    performanceWeight: weights?.performanceWeight ?? 40,
    assessmentWeight: weights?.assessmentWeight ?? 20,
  });

  const term = Math.min(3, Math.max(1, Number(quarter) || 1));

  const payload = {
    student_id: studentId,
    subject_id: subjectId,
    school_year: schoolYear || SCHOOL_YEAR_DEFAULT,
    quarter: term,
    written_scores: writtenScores || [],
    performance_scores: performanceScores || [],
    assessment_score:
      assessmentScore === "" || assessmentScore == null
        ? null
        : Number(assessmentScore),
    final_transmuted_grade: computed.transmutedGrade,
  };

  let result;
  if (gradeId) {
    result = await supabase
      .from("grades")
      .update(payload)
      .eq("id", gradeId)
      .select("*")
      .single();
  } else {
    result = await supabase
      .from("grades")
      .upsert(payload, {
        onConflict: "student_id,subject_id,school_year,quarter",
      })
      .select("*")
      .single();
  }

  if (result.error) return { error: result.error.message };

  revalidatePath("/teacher/gradebook");
  revalidatePath("/student/grades");
  revalidatePath("/parent/grades");
  return { data: result.data, computed };
}

export async function saveClassRecord({ assignmentId, data }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!teacher) return { error: "Teacher account not found." };

  const { data: assignment } = await supabase
    .from("teacher_assignments")
    .select(
      "id, subject_id, school_year, sections(school_year), subjects(written_weight, performance_weight, assessment_weight)"
    )
    .eq("id", assignmentId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (!assignment) {
    return { error: "You can only edit your assigned class records." };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("class_records")
    .select("id, workflow_status")
    .eq("assignment_id", assignmentId)
    .maybeSingle();

  const status = existing?.workflow_status || GRADE_WORKFLOW.DRAFT;
  if (!canTeacherEditWorkflow(status)) {
    return {
      error:
        status === GRADE_WORKFLOW.LOCKED
          ? "This class record is locked by the registrar. Request an unlock to edit."
          : `Cannot edit while status is "${status}". Wait for return from the department head or registrar.`,
    };
  }

  const { data: saved, error } = await admin
    .from("class_records")
    .upsert(
      {
        assignment_id: assignmentId,
        data: data || {},
        updated_by: user.id,
        workflow_status: status === GRADE_WORKFLOW.RETURNED ? GRADE_WORKFLOW.DRAFT : status,
      },
      { onConflict: "assignment_id" }
    )
    .select("id, updated_at, workflow_status")
    .single();

  if (error) {
    // Fallback if workflow columns not migrated yet
    if (String(error.message || "").includes("workflow_status")) {
      const fallback = await supabase
        .from("class_records")
        .upsert(
          {
            assignment_id: assignmentId,
            data: data || {},
            updated_by: user.id,
          },
          { onConflict: "assignment_id" }
        )
        .select("id, updated_at")
        .single();
      if (fallback.error) return { error: fallback.error.message };
      revalidatePath(`/teacher/gradebook/${assignmentId}`);
      return {
        data: fallback.data,
        warning:
          "Grade validation columns missing. Run supabase/grade-validation-upgrade.sql. Grades still auto-save to the workbook only.",
      };
    }
    return { error: error.message };
  }

  // Grades are published only when the registrar locks the record.
  revalidatePath(`/teacher/gradebook/${assignmentId}`);
  revalidatePath("/teacher/gradebook");
  return { data: saved };
}

export async function markAttendance({
  studentId,
  sectionId,
  date,
  status,
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const attendanceDate = date || new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("attendance")
    .upsert(
      {
        student_id: studentId,
        section_id: sectionId,
        date: attendanceDate,
        status,
      },
      { onConflict: "student_id,date" }
    )
    .select("*")
    .single();

  if (error) return { error: error.message };

  // Absence SMS via admin (needs parent phone)
  if (status === "absent") {
    try {
      const { sendAbsenceAlert } = await import("@/actions/sms");
      await sendAbsenceAlert({ studentId, date: attendanceDate });
    } catch {
      // Non-blocking
    }
  }

  revalidatePath("/teacher/attendance");
  return { data };
}

export async function createDocumentRequest({
  studentId,
  documentType,
  notes,
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("document_requests")
    .insert({
      student_id: studentId,
      document_type: documentType,
      notes: notes || null,
      status: "Pending",
    })
    .select("*")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/student/requests");
  revalidatePath("/registrar/requests");
  return { data };
}

export async function updateDocumentRequestStatus({ id, status, notes }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const updates = { status };
  if (notes !== undefined) updates.notes = notes;

  const { data, error } = await supabase
    .from("document_requests")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/registrar/requests");
  revalidatePath("/student/requests");
  return { data };
}

export async function approveTeacher({ teacherProfileId, approve }) {
  const admin = createAdminClient();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (me?.role !== "registrar") return { error: "Registrar only" };

  if (approve) {
    const { error } = await admin
      .from("profiles")
      .update({ status: "active" })
      .eq("id", teacherProfileId)
      .eq("role", "teacher");
    if (error) return { error: error.message };
  } else {
    const { data: teacher } = await admin
      .from("teachers")
      .select("id")
      .eq("profile_id", teacherProfileId)
      .maybeSingle();
    if (teacher) {
      await admin.from("teachers").delete().eq("id", teacher.id);
    }
    await admin.from("profiles").delete().eq("id", teacherProfileId);
    await admin.auth.admin.deleteUser(teacherProfileId);
  }

  revalidatePath("/registrar/teachers");
  revalidatePath("/registrar");
  return { ok: true };
}

export async function promoteStudents({ studentIds, newGradeLevel, newSectionId, status }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "registrar") return { error: "Registrar only" };

  const updates = {};
  if (newGradeLevel) updates.grade_level = Number(newGradeLevel);
  if (newSectionId) updates.section_id = newSectionId;
  if (status) updates.status = status;

  const { error } = await supabase
    .from("students")
    .update(updates)
    .in("id", studentIds);

  if (error) return { error: error.message };
  revalidatePath("/registrar/students");
  return { ok: true };
}

export async function transferSection({ studentIds, sectionId }) {
  return promoteStudents({
    studentIds,
    newSectionId: sectionId,
    status: "enrolled",
  });
}
