import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ROLE_HOME } from "@/lib/constants";

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

  if (profile.role === "student" && !roles.includes("student-activating")) {
    const { data: student } = await supabase
      .from("students")
      .select("activation_status, section_id, status")
      .eq("profile_id", user.id)
      .maybeSingle();

    const activation = student?.activation_status || "active";
    if (activation === "incomplete") redirect("/student/activate");
    // pending students may use temporary dashboard via requireRole("student")
  }

  if (profile.role === "student" && roles.includes("student-enrolled")) {
    const { data: student } = await supabase
      .from("students")
      .select("activation_status, section_id, status")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (student?.activation_status !== "active") {
      redirect("/student?notice=activation");
    }
    const enrolled =
      student?.status === "enrolled" ||
      student?.status === "promoted" ||
      Boolean(student?.section_id);
    if (!enrolled) redirect("/student?notice=enrollment");
  }

  return { supabase, user, profile };
}
