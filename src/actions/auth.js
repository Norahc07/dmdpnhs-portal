"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { invalidateRegistrarCaches } from "@/lib/cache/revalidate-registrar";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatBirthdatePassword,
  ROLE_HOME,
  studentEmailFromLrn,
  teacherIdYearCode,
} from "@/lib/constants";
import {
  findActiveStudentByLrn,
  findAnyStudentByLrn,
  normalizeLrn,
} from "@/lib/student-active";


/**
 * Auto Teacher ID: T{YY}-{XXXXX}
 * T  = Teacher
 * YY = current year (e.g. 2026 → 26)
 * XXXXX = random 5-digit number, collision-checked
 */
async function generateTeacherId(admin) {
  const year = teacherIdYearCode();

  for (let i = 0; i < 40; i += 1) {
    const suffix = String(Math.floor(10000 + Math.random() * 90000));
    const teacherId = `T${year}-${suffix}`;
    const { data } = await admin
      .from("teachers")
      .select("id")
      .eq("teacher_id", teacherId)
      .maybeSingle();
    if (!data) return teacherId;
  }
  throw new Error("Unable to generate a unique Teacher ID");
}

export async function loginStudent({ lrn, password }) {
  const cleanLrn = normalizeLrn(lrn);
  const pass = String(password || "");

  if (!/^\d{12}$/.test(cleanLrn)) {
    return { error: "LRN must be exactly 12 digits." };
  }
  if (!pass) {
    return { error: "Enter your password." };
  }

  const admin = createAdminClient();
  const { data: student, error: studentError } = await findActiveStudentByLrn(
    admin,
    cleanLrn,
    "id, profile_id, activation_status, status, section_id"
  );

  if (studentError) {
    return {
      error:
        "Could not look up your LRN right now. Try again, or contact the registrar.",
    };
  }

  if (!student) {
    const { data: anyRow } = await findAnyStudentByLrn(
      admin,
      cleanLrn,
      "id, deleted_at"
    );
    if (anyRow?.deleted_at) {
      return {
        error:
          "This LRN is in Trash. Ask the registrar to restore it before signing in.",
      };
    }
    return {
      error:
        "Student record not found. Ask the registrar to enroll your LRN first, then sign in.",
    };
  }

  if (!student.profile_id) {
    return {
      error:
        "No portal account yet. Use Register Account with your LRN and birthdate to create a password.",
    };
  }

  let email = studentEmailFromLrn(cleanLrn);
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, status, role")
    .eq("id", student.profile_id)
    .maybeSingle();
  if (profile?.email) email = profile.email;

  const supabase = await createClient();

  const { error: signError } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (signError) {
    return {
      error:
        "Invalid LRN or password. After registrar enrollment, the default password is your birthdate (YYYYMMDD) unless you changed it.",
    };
  }

  const activation = student.activation_status || "active";
  if (activation === "incomplete") redirect("/student/activate");
  if (activation === "pending") redirect("/student");
  redirect("/student");
}

/**
 * Phase 1 — Student self-registration after registrar enrollment.
 * Verify LRN + birthdate, create password, then continue to Phase 2 profile.
 */
export async function registerStudent(form) {
  const cleanLrn = normalizeLrn(form.lrn);
  const birthdate = String(form.birthdate || "").trim();
  const password = String(form.password || "");
  const confirmPassword = String(form.confirmPassword || "");

  if (!/^\d{12}$/.test(cleanLrn)) {
    return { error: "LRN must be exactly 12 digits." };
  }
  if (!birthdate) return { error: "Enter your birthdate." };
  if (password.length < 5) {
    return { error: "Password must be at least 5 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const admin = createAdminClient();
  // Flat select only — nested profiles() embeds have caused false "not enrolled" errors.
  const { data: student, error: studentError } = await findActiveStudentByLrn(
    admin,
    cleanLrn,
    "id, birthdate, profile_id, status, section_id, activation_status"
  );

  if (studentError) {
    return {
      error:
        "Could not verify your LRN right now. Try again, or contact the registrar.",
    };
  }

  if (!student) {
    const { data: anyRow } = await findAnyStudentByLrn(
      admin,
      cleanLrn,
      "id, deleted_at, activation_status"
    );
    if (anyRow?.deleted_at) {
      return {
        error:
          "This LRN is in Trash. Ask the registrar to restore it before registering.",
      };
    }
    return {
      error:
        "You are not enrolled yet. Please visit the school registrar to enroll your LRN first.",
    };
  }

  const activation = String(student.activation_status || "")
    .trim()
    .toLowerCase();

  // Registrar enroll already creates a portal account — activated students must Sign In.
  if (activation === "active") {
    return {
      error:
        "This account is already activated. Sign in with your LRN and password (default is birthdate YYYYMMDD if you never changed it).",
    };
  }

  if (activation === "pending" && student.profile_id) {
    return {
      error:
        "Your details are waiting for registrar verification. Sign in with your LRN and password to view your temporary dashboard.",
    };
  }

  const isEnrolled =
    student.status === "enrolled" ||
    student.status === "promoted" ||
    Boolean(student.section_id) ||
    activation === "pending" ||
    activation === "incomplete" ||
    activation === "active";

  if (!isEnrolled) {
    return {
      error:
        "Your LRN is on file but not marked enrolled. Contact the registrar.",
    };
  }

  const birthOk =
    formatBirthdatePassword(student.birthdate) ===
    formatBirthdatePassword(birthdate);
  if (!birthOk) {
    return { error: "LRN and birthdate do not match school records." };
  }

  let email = studentEmailFromLrn(cleanLrn);
  let firstName = "Student";
  let lastName = cleanLrn;
  if (student.profile_id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", student.profile_id)
      .maybeSingle();
    if (profile?.email) email = profile.email;
    if (profile?.first_name) firstName = profile.first_name;
    if (profile?.last_name) lastName = profile.last_name;
  }

  let userId = student.profile_id;

  if (userId) {
    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (updateErr) return { error: updateErr.message };
  } else {
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: "student",
          first_name: firstName,
          last_name: lastName,
        },
      });

    if (createError) {
      const { data: list } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const existing = list?.users?.find(
        (u) => String(u.email).toLowerCase() === email.toLowerCase()
      );
      if (!existing) return { error: createError.message };
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });
    } else {
      userId = created.user.id;
    }

    await admin.from("profiles").upsert({
      id: userId,
      role: "student",
      first_name: firstName,
      last_name: lastName,
      email,
      status: "pending",
    });

    await admin
      .from("students")
      .update({ profile_id: userId })
      .eq("id", student.id);
  }

  await admin
    .from("profiles")
    .update({ status: "pending" })
    .eq("id", userId);

  // Phase 2 still needed — keep incomplete, but never demote pending/active.
  if (activation !== "pending" && activation !== "active") {
    const { error: stuErr } = await admin
      .from("students")
      .update({
        activation_status: "incomplete",
      })
      .eq("id", student.id);
    if (stuErr) return { error: stuErr.message };
  }

  const supabase = await createClient();
  const { error: signError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signError) {
    return {
      ok: true,
      message:
        "Account created. Sign in with your LRN and password to complete your personal details.",
    };
  }

  invalidateRegistrarCaches();
  revalidatePath("/student/activate");
  revalidatePath("/registrar/activations");
  revalidatePath("/registrar");
  redirect("/student/activate");
}

/**
 * Reset password: verify LRN + birthdate, then set a new password.
 */
export async function resetStudentPassword(form) {
  const cleanLrn = normalizeLrn(form.lrn);
  const birthdate = String(form.birthdate || "").trim();
  const password = String(form.password || "");
  const confirmPassword = String(form.confirmPassword || "");

  if (!/^\d{12}$/.test(cleanLrn)) {
    return { error: "LRN must be exactly 12 digits." };
  }
  if (!birthdate) return { error: "Enter your birthdate." };
  if (password.length < 5) {
    return { error: "Password must be at least 5 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const admin = createAdminClient();
  const { data: student, error: studentError } = await findActiveStudentByLrn(
    admin,
    cleanLrn,
    "id, birthdate, profile_id, activation_status"
  );

  if (studentError) {
    return {
      error:
        "Could not verify your LRN right now. Try again, or contact the registrar.",
    };
  }

  if (!student) {
    return { error: "Student record not found." };
  }

  if (
    formatBirthdatePassword(student.birthdate) !==
    formatBirthdatePassword(birthdate)
  ) {
    return { error: "LRN and birthdate do not match." };
  }

  if (!student.profile_id) {
    return {
      error: "No account yet. Please Register Account first.",
    };
  }

  const { error } = await admin.auth.admin.updateUserById(student.profile_id, {
    password,
    email_confirm: true,
  });

  if (error) return { error: error.message };
  return { ok: true, message: "Password updated. You can sign in now." };
}

/**
 * Faculty reset: Teacher ID + registered email must match, then set a new password.
 * Registrars should contact the school admin (no self-reset).
 */
export async function resetStaffPassword(form) {
  const teacherId = String(form.teacherId || "").trim().toUpperCase();
  const email = String(form.email || "").trim().toLowerCase();
  const password = String(form.password || "");
  const confirmPassword = String(form.confirmPassword || "");

  if (!/^T\d{2}-\d{5}$/.test(teacherId)) {
    return { error: "Enter your Teacher ID (e.g. T26-43817)." };
  }
  if (!email) return { error: "Enter the email used on your faculty account." };
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const admin = createAdminClient();
  const { data: teacher } = await admin
    .from("teachers")
    .select("id, profile_id, teacher_id, profiles(email, role)")
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (!teacher?.profile_id || !teacher.profiles?.email) {
    return { error: "Teacher ID not found." };
  }
  if (String(teacher.profiles.email).toLowerCase() !== email) {
    return { error: "Teacher ID and email do not match." };
  }
  if (teacher.profiles.role !== "teacher") {
    return { error: "Use this reset only for faculty accounts." };
  }

  const { error } = await admin.auth.admin.updateUserById(teacher.profile_id, {
    password,
    email_confirm: true,
  });
  if (error) return { error: error.message };
  return { ok: true, message: "Password updated. You can sign in now." };
}

/**
 * Faculty login accepts:
 * - email + password, OR
 * - Teacher ID (e.g. T26-43817) + password
 */
export async function loginStaff({ email, password }) {
  const identifier = String(email || "").trim();
  if (!identifier || !password) {
    return { error: "Enter your email or Teacher ID and password." };
  }

  let loginEmail = identifier.toLowerCase();
  const teacherIdMatch = identifier.toUpperCase().match(/^T\d{2}-\d{5}$/);

  if (teacherIdMatch) {
    const admin = createAdminClient();
    const teacherId = identifier.toUpperCase();
    const { data: teacher, error: teacherError } = await admin
      .from("teachers")
      .select("profile_id, profiles(email, role, status)")
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (teacherError || !teacher?.profiles?.email) {
      return { error: "Teacher ID not found. Use your faculty email instead." };
    }

    loginEmail = String(teacher.profiles.email).toLowerCase();
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password,
  });

  if (error) {
    return {
      error:
        "Invalid email/Teacher ID or password. Use the email you registered with, or your Teacher ID (e.g. T26-43817).",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return { error: "Profile not found. Contact the registrar." };

  if (profile.role === "parent") {
    await supabase.auth.signOut();
    return {
      error:
        "The parent portal is no longer available. Grades and attendance are in the student portal.",
    };
  }

  if (profile.role === "teacher" && profile.status === "pending") {
    redirect("/teacher/pending");
  }

  redirect(ROLE_HOME[profile.role] || "/login");
}

export async function registerTeacher(formData) {
  const firstName = String(formData.firstName || "").trim();
  const lastName = String(formData.lastName || "").trim();
  const email = String(formData.email || "").trim().toLowerCase();
  const password = String(formData.password || "");
  const facultyDept = String(formData.facultyDept || "").trim();

  if (!firstName || !lastName || !email || password.length < 8) {
    return {
      error: "Complete all fields. Password must be at least 8 characters.",
    };
  }

  const admin = createAdminClient();
  const teacherId = await generateTeacherId(admin);

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "teacher",
        first_name: firstName,
        last_name: lastName,
      },
    });

  if (createError) return { error: createError.message };

  const userId = created.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    role: "teacher",
    first_name: firstName,
    last_name: lastName,
    email,
    status: "pending",
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: profileError.message };
  }

  const { error: teacherError } = await admin.from("teachers").insert({
    profile_id: userId,
    teacher_id: teacherId,
    faculty_dept: facultyDept || null,
    units: 0,
  });

  if (teacherError) {
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
    return { error: teacherError.message };
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });

  redirect("/teacher/pending");
}

export async function changeAccountPassword({
  currentPassword,
  newPassword,
  confirmPassword,
}) {
  const current = String(currentPassword || "");
  const next = String(newPassword || "");
  const confirm = String(confirmPassword || "");

  if (!current) return { error: "Enter your current password." };
  if (next.length < 5) {
    return { error: "New password must be at least 5 characters." };
  }
  if (next !== confirm) return { error: "New passwords do not match." };
  if (current === next) {
    return { error: "Choose a new password that is different from the current one." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, email")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !["student", "teacher"].includes(profile.role)) {
    return { error: "This password page is for students and educators." };
  }

  const email = user.email || profile.email;
  if (!email) return { error: "Account email was not found." };

  const { error: checkError } = await supabase.auth.signInWithPassword({
    email,
    password: current,
  });
  if (checkError) return { error: "Current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: error.message };

  const home = profile.role === "teacher" ? "/teacher" : "/student";
  revalidatePath(`${home}/settings`);
  revalidatePath(`${home}/profile`);
  return { ok: true };
}

export async function changeStudentPassword(payload) {
  return changeAccountPassword(payload);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  try {
    const { cookies } = await import("next/headers");
    const { AUTH_GATE_COOKIE } = await import("@/lib/auth-gate");
    const jar = await cookies();
    jar.set(AUTH_GATE_COOKIE, "", { path: "/", maxAge: 0 });
  } catch {
    /* cookie jar unavailable outside request */
  }
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function getSessionProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return profile ? { user, profile } : null;
}
