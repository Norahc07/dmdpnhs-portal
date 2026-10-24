"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setSectionSecretary({ sectionId, studentId }) {
  const auth = await requireRole("teacher");
  if (auth.error) return auth;
  const { profile } = auth;

  const sid = String(sectionId || "").trim();
  if (!sid) return { error: "Choose a section." };

  const nextStudentId = studentId ? String(studentId).trim() : null;
  const admin = createAdminClient();

  const { data: teacher } = await admin
    .from("teachers")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!teacher?.id) return { error: "Teacher record not found." };

  const { data: section } = await admin
    .from("sections")
    .select("id, adviser_id, section_name, grade_level")
    .eq("id", sid)
    .maybeSingle();
  if (!section) return { error: "Section not found." };
  if (section.adviser_id !== teacher.id) {
    return {
      error: "Only the class adviser can assign or remove the class secretary.",
    };
  }

  if (nextStudentId) {
    const { data: student } = await admin
      .from("students")
      .select("id, section_id, activation_status")
      .eq("id", nextStudentId)
      .maybeSingle();
    if (!student) return { error: "Student not found." };
    if (student.section_id !== sid) {
      return {
        error: "The secretary must be a student enrolled in this section.",
      };
    }
    if (student.activation_status !== "active") {
      return { error: "The secretary must have an activated student account." };
    }
  }

  const { error } = await admin
    .from("sections")
    .update({ secretary_student_id: nextStudentId })
    .eq("id", sid);

  if (error) {
    if (/secretary_student_id/i.test(String(error.message || ""))) {
      return {
        error:
          "Apply supabase/section-secretary.sql in the Supabase SQL editor first.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/teacher/students");
  revalidatePath("/teacher");
  revalidatePath("/student");
  revalidatePath("/student/class-attendance");
  revalidatePath("/student/class-secretary");
  return { ok: true };
}
