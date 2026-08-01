"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatBirthdatePassword,
  parentEmailFromCode,
  ROLE_HOME,
  studentEmailFromLrn,
  teacherIdYearCode,
} from "@/lib/constants";

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
  const cleanLrn = String(lrn || "").trim();
  const pass = String(password || "");

  if (!/^\d{12}$/.test(cleanLrn)) {
    return { error: "LRN must be exactly 12 digits." };
  }
  if (!pass) {
    return { error: "Enter your password." };
  }

  const admin = createAdminClient();
  const { data: student, error: studentError } = await admin
    .from("students")
    .select(
      "id, profile_id, activation_status, profiles(id, email, status, role)"
    )
    .eq("lrn", cleanLrn)
    .maybeSingle();

  if (studentError || !student) {
    return {
      error:
        "Student record not found. Register an account if you are already enrolled, or contact the registrar.",
    };
  }

  if (!student.profile_id) {
    return {
      error:
        "No portal account yet. Click Register Account and verify with your LRN and birthdate.",
    };
  }

  const email = student.profiles?.email || studentEmailFromLrn(cleanLrn);
  const supabase = await createClient();

  const { error: signError } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (signError) {
    return { error: "Invalid LRN or password." };
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
  const cleanLrn = String(form.lrn || "").trim();
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
  const { data: student, error: studentError } = await admin
    .from("students")
    .select(
      "id, birthdate, profile_id, status, section_id, activation_status, profiles(email, first_name, last_name)"
    )
    .eq("lrn", cleanLrn)
    .maybeSingle();

  if (studentError || !student) {
    return {
      error:
        "You are not enrolled yet. Please visit the school registrar to enroll first.",
    };
  }

  const isEnrolled =
    student.status === "enrolled" ||
    student.status === "promoted" ||
    Boolean(student.section_id);

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

  if (student.activation_status === "active") {
    return {
      error: "This account is already active. Please sign in with your password.",
    };
  }

  if (student.activation_status === "pending" && student.profile_id) {
    return {
      error:
        "Your details are waiting for registrar verification. Sign in to view your temporary dashboard.",
    };
  }

  const email = student.profiles?.email || studentEmailFromLrn(cleanLrn);
  const firstName = student.profiles?.first_name || "Student";
  const lastName = student.profiles?.last_name || cleanLrn;

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

  // Stay incomplete until Phase 2 personal/parent details are submitted
  const { error: stuErr } = await admin
    .from("students")
    .update({
      activation_status: "incomplete",
    })
    .eq("id", student.id);

  if (stuErr) return { error: stuErr.message };

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

  revalidatePath("/student/activate");
  redirect("/student/activate");
}

/**
 * Reset password: verify LRN + birthdate, then set a new password.
 */
export async function resetStudentPassword(form) {
  const cleanLrn = String(form.lrn || "").trim();
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
  const { data: student } = await admin
    .from("students")
    .select("id, birthdate, profile_id, activation_status, profiles(email)")
    .eq("lrn", cleanLrn)
    .maybeSingle();

  if (!student) {
    return { error: "Student record not found." };
  }

  if (
    formatBirthdatePassword(student.birthdate) !==
    formatBirthdatePassword(birthdate)
  ) {
    return { error: "LRN and birthdate do not match." };
  }

  if (!student.profile_id || student.activation_status === "incomplete") {
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

export async function loginParent({ accessCode }) {
  const code = String(accessCode || "").trim().toUpperCase();
  if (!code) return { error: "Enter your Parent Access Code." };

  const admin = createAdminClient();
  const { data: parent, error } = await admin
    .from("parents")
    .select("id, access_code, profile_id, profiles(id, email, first_name, last_name, status)")
    .eq("access_code", code)
    .maybeSingle();

  if (error || !parent) {
    return { error: "Invalid Parent Access Code." };
  }

  const email =
    parent.profiles?.email || parentEmailFromCode(code);
  const password = code;
  const supabase = await createClient();

  let { error: signError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signError) {
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: "parent" },
      });

    if (createError) {
      const { data: list } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const existing = list?.users?.find((u) => u.email === email);
      if (!existing) return { error: createError.message };
      await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      });
    } else if (created?.user) {
      await admin.from("profiles").upsert({
        id: created.user.id,
        role: "parent",
        first_name: parent.profiles?.first_name || "Parent",
        last_name: parent.profiles?.last_name || code,
        email,
        status: "active",
      });
      await admin
        .from("parents")
        .update({ profile_id: created.user.id })
        .eq("id", parent.id);
    }

    ({ error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    }));
  }

  if (signError) return { error: signError.message };
  redirect("/parent");
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

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
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
