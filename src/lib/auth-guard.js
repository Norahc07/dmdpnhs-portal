import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ROLE_HOME } from "@/lib/constants";
import { countUnreadAnnouncementsForStudent } from "@/lib/announcements";
import {
  findSecretarySection,
  isSectionSecretary,
} from "@/lib/class-secretary";

export async function requireRole(allowedRoles) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(profile.role)) {
    redirect(ROLE_HOME[profile.role] || "/login");
  }

  if (
    profile.role === "teacher" &&
    profile.status === "pending" &&
    !roles.includes("teacher-pending")
  ) {
    redirect("/teacher/pending");
  }

  let student = null;
  let studentAccess = null;
  if (profile.role === "student" && !roles.includes("student-activating")) {
    if (profile.status === "trashed") {
      redirect("/login/student?notice=trashed");
    }
    let studentRes = await supabase
      .from("students")
      .select("id, activation_status, section_id, status, deleted_at")
      .eq("profile_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (studentRes.error && /deleted_at/i.test(studentRes.error.message || "")) {
      studentRes = await supabase
        .from("students")
        .select("id, activation_status, section_id, status")
        .eq("profile_id", user.id)
        .maybeSingle();
    }
    const data = studentRes.data;
    if (!data) {
      redirect("/login/student?notice=trashed");
    }
    student = data;

    const activation = student?.activation_status || "active";
    if (activation === "incomplete") redirect("/student/activate");

    const enrolled =
      student?.status === "enrolled" ||
      student?.status === "promoted" ||
      Boolean(student?.section_id);

    if (roles.includes("student-enrolled")) {
      if (student?.activation_status !== "active") {
        redirect("/student?notice=activation");
      }
      if (!enrolled) redirect("/student?notice=enrollment");
    }

    const activated = student?.activation_status === "active";
    const isSecretary =
      activated && enrolled && student?.id
        ? await isSectionSecretary(student.id)
        : false;
    studentAccess = { activated, enrolled, isSecretary };
  }

  return { supabase, user, profile, student, studentAccess };
}

export async function requireSecretaryWorkspace() {
  const auth = await requireRole(["student", "student-enrolled"]);
  if (!auth.studentAccess?.isSecretary || !auth.student?.id) {
    redirect("/student");
  }
  const section = await findSecretarySection(auth.student.id);
  if (!section?.id) redirect("/student");
  return { ...auth, section };
}
