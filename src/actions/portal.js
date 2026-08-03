"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeComponentWeights } from "@/lib/class-record";
import { computeDepEdGrade } from "@/lib/deped-grades";
import { SCHOOL_SHORT, SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import { sendSMS } from "@/lib/semaphore";
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

export async function saveClassRecord({ assignmentId, data, term = 1 }) {
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

  const recordTerm = [1, 2, 3].includes(Number(term)) ? Number(term) : 1;

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("class_records")
    .select("id, workflow_status, term")
    .eq("assignment_id", assignmentId)
    .eq("term", recordTerm)
    .maybeSingle();

  // Fallback: older DBs without term column — treat as term 1 only
  const termColumnMissing =
    existingError &&
    String(existingError.message || "").toLowerCase().includes("term");

  let existingRow = existing;
  if (termColumnMissing) {
    if (recordTerm !== 1) {
      return {
        error:
          "Run supabase/class-records-term.sql so teachers can create 2nd and Final Semestral class records.",
      };
    }
    const legacy = await admin
      .from("class_records")
      .select("id, workflow_status")
      .eq("assignment_id", assignmentId)
      .maybeSingle();
    existingRow = legacy.data;
  }

  const status = existingRow?.workflow_status || GRADE_WORKFLOW.DRAFT;
  if (!canTeacherEditWorkflow(status)) {
    return {
      error:
        status === GRADE_WORKFLOW.LOCKED
          ? "This class record is locked by the registrar. Request an unlock to edit."
          : `Cannot edit while status is "${status}". Wait for return from the department head or registrar.`,
    };
  }

  const payload = {
    assignment_id: assignmentId,
    data: data || {},
    updated_by: user.id,
    workflow_status:
      status === GRADE_WORKFLOW.RETURNED ? GRADE_WORKFLOW.DRAFT : status,
  };
  if (!termColumnMissing) {
    payload.term = recordTerm;
  }

  const { data: saved, error } = await admin
    .from("class_records")
    .upsert(payload, {
      onConflict: termColumnMissing ? "assignment_id" : "assignment_id,term",
    })
    .select("id, updated_at, workflow_status")
    .single();

  if (error) {
    // Fallback if workflow columns not migrated yet
    if (String(error.message || "").includes("workflow_status")) {
      const fallbackPayload = {
        assignment_id: assignmentId,
        data: data || {},
        updated_by: user.id,
      };
      if (!termColumnMissing) fallbackPayload.term = recordTerm;
      const fallback = await supabase
        .from("class_records")
        .upsert(fallbackPayload, {
          onConflict: termColumnMissing ? "assignment_id" : "assignment_id,term",
        })
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
  subjectId = null,
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const allowed = ["present", "absent", "late", "excused"];
  if (!allowed.includes(status)) {
    return { error: "Invalid attendance status." };
  }

  const attendanceDate = date || new Date().toISOString().slice(0, 10);
  const sid = subjectId || null;

  // Partial unique indexes (homeroom vs subject) are not usable with PostgREST
  // ON CONFLICT — find the row first, then update or insert.
  let existingQuery = supabase
    .from("attendance")
    .select("id")
    .eq("student_id", studentId)
    .eq("date", attendanceDate);

  if (sid) {
    existingQuery = existingQuery.eq("subject_id", sid);
  } else {
    existingQuery = existingQuery.is("subject_id", null);
  }

  const { data: existing, error: findError } = await existingQuery.maybeSingle();
  if (findError && !/subject_id/i.test(String(findError.message || ""))) {
    return { error: findError.message };
  }

  let data = null;
  let error = null;

  if (existing?.id) {
    const updatePayload = {
      status,
      section_id: sectionId,
    };
    if (sid) updatePayload.subject_id = sid;

    const res = await supabase
      .from("attendance")
      .update(updatePayload)
      .eq("id", existing.id)
      .select("*")
      .single();
    data = res.data;
    error = res.error;
  } else {
    const insertPayload = {
      student_id: studentId,
      section_id: sectionId,
      date: attendanceDate,
      status,
      subject_id: sid,
    };

    const res = await supabase
      .from("attendance")
      .insert(insertPayload)
      .select("*")
      .single();
    data = res.data;
    error = res.error;

    // Legacy DB without subject_id column
    if (error && /subject_id/i.test(String(error.message || ""))) {
      const retry = await supabase
        .from("attendance")
        .insert({
          student_id: studentId,
          section_id: sectionId,
          date: attendanceDate,
          status,
        })
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }

    // Race: another mark inserted first — update that row
    if (
      error &&
      /duplicate|unique/i.test(String(error.message || ""))
    ) {
      let raceQuery = supabase
        .from("attendance")
        .select("id")
        .eq("student_id", studentId)
        .eq("date", attendanceDate);
      if (sid) raceQuery = raceQuery.eq("subject_id", sid);
      else raceQuery = raceQuery.is("subject_id", null);

      const { data: raced } = await raceQuery.maybeSingle();
      if (raced?.id) {
        const retry = await supabase
          .from("attendance")
          .update({ status, section_id: sectionId })
          .eq("id", raced.id)
          .select("*")
          .single();
        data = retry.data;
        error = retry.error;
      }
    }
  }

  if (error) return { error: error.message };

  if (status === "absent") {
    try {
      const { sendAbsenceAlert } = await import("@/actions/sms");
      await sendAbsenceAlert({ studentId, date: attendanceDate });
    } catch {
      // Non-blocking
    }
  }

  // Optimistic UI already updates teacher attendance; avoid full RSC refresh.
  revalidatePath("/student/attendance");
  revalidatePath("/parent/attendance");
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

  const allowed = ["SF9", "SF10", "Good Moral"];
  const type = String(documentType || "").trim();
  if (!allowed.includes(type)) {
    return {
      error: "Only SF9, SF10, and Good Moral can be requested through the portal.",
    };
  }

  // Ensure the requester owns this student record
  const { data: student } = await supabase
    .from("students")
    .select("id, profile_id, activation_status")
    .eq("id", studentId)
    .maybeSingle();
  if (!student || student.profile_id !== user.id) {
    return { error: "Student record not found." };
  }
  if (student.activation_status !== "active") {
    return { error: "Activate your student portal before requesting documents." };
  }

  const reason = String(notes || "").trim();
  if (!reason) {
    return { error: "Please state the reason for requesting this document." };
  }

  const { data, error } = await supabase
    .from("document_requests")
    .insert({
      student_id: studentId,
      document_type: type,
      notes: reason,
      status: "Pending",
      appointment_date: null,
      appointment_time: null,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/student/requests");
  revalidatePath("/registrar/requests");
  revalidatePath("/registrar/documents");
  return { data };
}

export async function updateDocumentRequestStatus({ id, status, notes }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const nextStatus = String(status || "").trim();
  if (!["Pending", "Ready for Pickup", "Already Claimed"].includes(nextStatus)) {
    return { error: "Invalid document status." };
  }

  const updates = { status: nextStatus };
  if (notes !== undefined) updates.notes = notes;

  const { data, error } = await supabase
    .from("document_requests")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { error: error.message };

  // Notify student (and parent if available) when document is ready for pickup
  if (nextStatus === "Ready for Pickup" && data?.student_id) {
    try {
      const admin = createAdminClient();
      const { data: student } = await admin
        .from("students")
        .select(
          "id, contact_number, emergency_contact_number, lrn, profiles(first_name, last_name)"
        )
        .eq("id", data.student_id)
        .maybeSingle();

      const name = `${student?.profiles?.first_name || ""} ${student?.profiles?.last_name || ""}`.trim();
      const docType = data.document_type || "document";
      const message = `${SCHOOL_SHORT}: Hi ${name || "student"}, your ${docType} request is Ready for Pickup at the registrar's office. Please bring a valid ID.`;

      const phones = [
        student?.contact_number,
        student?.emergency_contact_number,
      ].filter(Boolean);

      const { data: links } = await admin
        .from("parent_student_links")
        .select("parents(phone_number)")
        .eq("student_id", data.student_id)
        .limit(1);
      const parentPhone = links?.[0]?.parents?.phone_number;
      if (parentPhone) phones.push(parentPhone);

      const unique = [...new Set(phones.map((p) => String(p).trim()).filter(Boolean))];
      for (const recipient of unique) {
        try {
          await sendSMS({
            recipient,
            message,
            triggerType: "document_ready",
          });
        } catch {
          // non-blocking per recipient
        }
      }
    } catch {
      // Notification failure must not block status update
    }
  }

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
  revalidatePath("/registrar/promotion");
  revalidatePath("/registrar/enrollment");
  return { ok: true };
}

export async function transferSection({ studentIds, sectionId }) {
  return promoteStudents({
    studentIds,
    newSectionId: sectionId,
    status: "enrolled",
  });
}
