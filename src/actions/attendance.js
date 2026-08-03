"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EXCUSE_REASON_TYPES } from "@/lib/attendance";
import {
  groupAttendanceByDate,
  recordsForMonth,
  summarizeAttendance,
  toDateKey,
} from "@/lib/attendance";

async function getAuthContext() {
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

  if (!profile) return { error: "Profile not found" };
  return { supabase, user, profile, admin: createAdminClient() };
}

async function getAuthStudent() {
  const auth = await getAuthContext();
  if (auth.error) return auth;
  if (auth.profile.role !== "student") {
    return { error: "Students only" };
  }

  const { data: student } = await auth.supabase
    .from("students")
    .select("id, section_id, grade_level, activation_status")
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  if (!student) return { error: "Student record not found." };
  return { ...auth, student };
}

async function assertCanViewStudentAttendance(auth, studentId) {
  if (auth.profile.role === "student") {
    const { data: student } = await auth.admin
      .from("students")
      .select("id")
      .eq("profile_id", auth.profile.id)
      .maybeSingle();
    if (!student || student.id !== studentId) {
      return { error: "You can only view your own attendance." };
    }
    return { ok: true };
  }

  if (auth.profile.role === "parent") {
    const { data: parent } = await auth.admin
      .from("parents")
      .select("id")
      .eq("profile_id", auth.profile.id)
      .maybeSingle();
    if (!parent) return { error: "Parent record not found." };

    const { data: link } = await auth.admin
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

  return { error: "Not allowed to view this attendance." };
}

/**
 * Fetch attendance + excuse letters for a student month view.
 * Students: own record. Parents: linked learners only.
 */
export async function getStudentAttendance(studentId, month, year) {
  const auth = await getAuthContext();
  if (auth.error) return { error: auth.error };

  const access = await assertCanViewStudentAttendance(auth, studentId);
  if (access.error) return { error: access.error };

  const m = Number(month) || new Date().getMonth() + 1;
  const y = Number(year) || new Date().getFullYear();
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const endDate = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(endDate).padStart(2, "0")}`;

  let recordsRes = await auth.admin
    .from("attendance")
    .select(
      `
      id, date, status, subject_id, section_id, notes,
      subjects ( id, subject_name )
    `
    )
    .eq("student_id", studentId)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: false });

  // Fallback if subjects join / subject_id column not migrated yet
  if (recordsRes.error) {
    recordsRes = await auth.admin
      .from("attendance")
      .select("id, date, status, section_id, notes")
      .eq("student_id", studentId)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false });
  }

  if (recordsRes.error) return { error: recordsRes.error.message };

  const records = (recordsRes.data || []).map((r) => ({
    ...r,
    date: toDateKey(r.date),
    subjectName: r.subjects?.subject_name || (r.subject_id ? "Subject" : "Daily / Homeroom"),
  }));

  let excuses = [];
  const { data: excuseRows, error: excuseError } = await auth.admin
    .from("excuse_letters")
    .select(
      "id, attendance_id, reason_type, explanation, file_url, status, created_at"
    )
    .eq("student_id", studentId);

  if (!excuseError) {
    excuses = excuseRows || [];
  }

  const excuseByAttendanceId = Object.fromEntries(
    excuses.map((e) => [e.attendance_id, e])
  );

  const enriched = records.map((r) => ({
    ...r,
    excuse: excuseByAttendanceId[r.id] || null,
  }));

  const monthRecords = recordsForMonth(enriched, m, y);
  const stats = summarizeAttendance(monthRecords);
  const days = groupAttendanceByDate(monthRecords);

  return {
    studentId,
    month: m,
    year: y,
    records: monthRecords,
    days,
    stats,
    excuses,
  };
}

/**
 * Student submits an excuse letter for an absent attendance row.
 */
export async function submitExcuseLetter(attendanceId, formData) {
  const auth = await getAuthStudent();
  if (auth.error) return { error: auth.error };

  const id = String(attendanceId || "").trim();
  if (!id) return { error: "Missing attendance record." };

  const reasonType = String(formData?.get?.("reasonType") || formData?.reasonType || "").trim();
  const explanation = String(
    formData?.get?.("explanation") || formData?.explanation || ""
  ).trim();
  const file = formData?.get?.("file") || null;

  if (!EXCUSE_REASON_TYPES.includes(reasonType)) {
    return { error: "Choose a valid reason (Illness, Emergency, or Calamity)." };
  }
  if (explanation.length < 10) {
    return { error: "Please explain the absence in at least 10 characters." };
  }

  const { data: attendance, error: attError } = await auth.admin
    .from("attendance")
    .select("id, student_id, status, date")
    .eq("id", id)
    .maybeSingle();

  if (attError) return { error: attError.message };
  if (!attendance || attendance.student_id !== auth.student.id) {
    return { error: "Attendance record not found." };
  }
  if (attendance.status !== "absent") {
    return { error: "Excuse letters can only be submitted for absent periods." };
  }

  let filePath = null;
  let fileUrl = null;

  if (file && typeof file === "object" && file.size > 0) {
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      return { error: "Attachment must be 5 MB or smaller." };
    }
    const ext = String(file.name || "file").split(".").pop()?.toLowerCase() || "bin";
    const allowed = ["pdf", "jpg", "jpeg", "png", "webp"];
    if (!allowed.includes(ext)) {
      return { error: "Upload a PDF or image (JPG, PNG, WebP)." };
    }

    filePath = `${auth.student.id}/${id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await auth.admin.storage
      .from("excuse-letters")
      .upload(filePath, file, {
        contentType: file.type || undefined,
        upsert: true,
      });

    if (uploadError) {
      // Storage bucket may not exist yet — still save the letter text
      console.error("[submitExcuseLetter] upload", uploadError.message);
    } else {
      const { data: publicData } = auth.admin.storage
        .from("excuse-letters")
        .getPublicUrl(filePath);
      fileUrl = publicData?.publicUrl || null;
    }
  }

  const payload = {
    attendance_id: id,
    student_id: auth.student.id,
    reason_type: reasonType,
    explanation,
    file_path: filePath,
    file_url: fileUrl,
    status: "pending",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await auth.admin
    .from("excuse_letters")
    .upsert(payload, { onConflict: "attendance_id" })
    .select("*")
    .single();

  if (error) {
    if (/excuse_letters/i.test(error.message) && /does not exist|schema cache/i.test(error.message)) {
      return {
        error:
          "Excuse letters are not enabled yet. Ask the registrar to run attendance-subjects-excuse.sql in Supabase.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/student/attendance");
  revalidatePath("/teacher/attendance");
  revalidatePath("/parent/attendance");
  return { data };
}

/**
 * Teacher/registrar approves an excuse → marks attendance excused (blue).
 */
export async function reviewExcuseLetter({ excuseId, approve, notes }) {
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

  if (!profile || !["teacher", "registrar"].includes(profile.role)) {
    return { error: "Teachers or registrar only." };
  }

  const admin = createAdminClient();
  const nextStatus = approve ? "approved" : "rejected";

  const { data: excuse, error } = await admin
    .from("excuse_letters")
    .update({
      status: nextStatus,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", excuseId)
    .select("id, attendance_id")
    .single();

  if (error) return { error: error.message };

  if (approve && excuse?.attendance_id) {
    await admin
      .from("attendance")
      .update({ status: "excused" })
      .eq("id", excuse.attendance_id);
  }

  revalidatePath("/student/attendance");
  revalidatePath("/teacher/attendance");
  return { ok: true };
}
