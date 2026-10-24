"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  formatBirthdatePassword,
  isSeniorHighGrade,
  parentIdYearCode,
  portalBaseUrl,
  SCHOOL_SHORT,
  SCHOOL_YEAR_DEFAULT,
  studentEmailFromLrn,
  teacherIdYearCode,
} from "@/lib/constants";
import { sendSMS } from "@/lib/semaphore";
import { FACULTY_POSITIONS } from "@/lib/grade-workflow";
import { parseOptionalEmail } from "@/lib/optional-email";

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

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

/** Parent Access Code: P{YY}-{XXXXX} — mirrors Teacher ID pattern */
export async function generateParentAccessCode(admin) {
  const year = parentIdYearCode();

  for (let i = 0; i < 40; i += 1) {
    const suffix = String(Math.floor(10000 + Math.random() * 90000));
    const code = `P${year}-${suffix}`;
    const { data } = await admin
      .from("parents")
      .select("id")
      .eq("access_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("Unable to generate a unique Parent Access Code");
}

async function requireRegistrar() {
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
  return { supabase, user, admin: createAdminClient() };
}

async function findParentByPhone(admin, phone) {
  const digits = normalizePhone(phone);
  if (digits.length < 10) return null;

  const { data } = await admin
    .from("parents")
    .select("id, access_code, phone_number, profile_id, profiles(first_name, last_name, email)")
    .not("phone_number", "is", null);

  return (
    (data || []).find((p) => normalizePhone(p.phone_number) === digits) || null
  );
}

/**
 * Phase 2 — Student completes personal data + parent/guardian emergency contacts.
 * Creates or links a guardian contact record (no parent portal login).
 * Registrar must verify before the student portal is fully activated.
 */
export async function submitStudentActivation(form) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = createAdminClient();

  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id, activation_status, profile_id, lrn, grade_level, section_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (studentError || !student) {
    return { error: "Student record not found." };
  }

  if (student.activation_status === "active") {
    return { error: "Your account is already activated." };
  }

  const firstName = String(form.firstName || "").trim();
  const middleName = String(form.middleName || "").trim();
  const lastName = String(form.lastName || "").trim();
  const contactNumber = String(form.contactNumber || "").trim();
  const personalEmail = String(form.personalEmail || "").trim().toLowerCase();
  const address = String(form.address || "").trim();
  const gradeLevel = Number(form.gradeLevel || student.grade_level || 0);
  const sectionId = form.sectionId || student.section_id || null;
  const emergencyName = String(form.emergencyContactName || "").trim();
  const emergencyNumber = String(form.emergencyContactNumber || "").trim();
  const emergencyAddress = String(form.emergencyContactAddress || "").trim();

  const parentFirstName = String(form.parentFirstName || "").trim();
  const parentLastName = String(form.parentLastName || "").trim();
  const parentPhone = String(form.parentPhone || "").trim();
  const parentEmail = parseOptionalEmail({
    email: form.parentEmail,
    none: form.parentEmailNone,
  });
  const parentAddress = String(form.parentAddress || "").trim();
  const parentRelationship = String(form.parentRelationship || "Guardian").trim();

  if (!firstName || !lastName) {
    return { error: "Enter your first and last name." };
  }
  if (![7, 8, 9, 10, 11, 12].includes(gradeLevel)) {
    return { error: "Select your grade level." };
  }
  if (!sectionId) {
    return { error: "Select your section." };
  }
  if (!contactNumber || normalizePhone(contactNumber).length < 10) {
    return { error: "Enter a valid contact number. This is required for SMS notices." };
  }
  if (!address) {
    return { error: "Enter your home address." };
  }
  if (!emergencyName || !emergencyNumber) {
    return { error: "Enter emergency contact name and number." };
  }
  if (!parentFirstName || !parentLastName || !parentPhone) {
    return {
      error:
        "Enter parent/guardian full name and contact number.",
    };
  }
  if (normalizePhone(parentPhone).length < 10) {
    return { error: "Enter a valid parent/guardian contact number." };
  }

  const existingParent = await findParentByPhone(admin, parentPhone);
  let accessCode = existingParent?.access_code || null;
  let parentRowId = existingParent?.id || null;

  if (!existingParent) {
    accessCode = await generateParentAccessCode(admin);
    const { data: parentRow, error: parentInsertError } = await admin
      .from("parents")
      .insert({
        access_code: accessCode,
        phone_number: parentPhone,
        email: parentEmail,
        relationship: parentRelationship,
      })
      .select("id, access_code")
      .single();

    if (parentInsertError) return { error: parentInsertError.message };
    parentRowId = parentRow.id;
    accessCode = parentRow.access_code || accessCode;
  } else {
    await admin
      .from("parents")
      .update({
        phone_number: parentPhone,
        email: parentEmail,
        relationship: parentRelationship,
      })
      .eq("id", existingParent.id);

    if (existingParent.profile_id) {
      await admin
        .from("profiles")
        .update({
          first_name: parentFirstName,
          last_name: parentLastName,
        })
        .eq("id", existingParent.profile_id);
    }
  }

  await admin.from("parent_student_links").upsert({
    parent_id: parentRowId,
    student_id: student.id,
  });

  await admin
    .from("profiles")
    .update({
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      status: "pending",
    })
    .eq("id", user.id);

  const studentUpdate = {
    contact_number: contactNumber,
    personal_email: personalEmail || null,
    address,
    grade_level: gradeLevel,
    section_id: sectionId,
    emergency_contact_name: emergencyName,
    emergency_contact_number: emergencyNumber,
    parent_access_code_shown: accessCode,
    activation_status: "pending",
    status: "enrolled",
  };

  // Store parent address in emergency address field when provided
  if (emergencyAddress || parentAddress) {
    // Keep emergency name/number as primary; address may be appended in notes via address field only for student
  }

  const { error: updateError } = await admin
    .from("students")
    .update(studentUpdate)
    .eq("id", student.id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/student");
  revalidatePath("/student/pending");
  revalidatePath("/registrar/activations");
  redirect("/student?notice=pending");
}

export async function approveStudentActivation({ studentId, approve }) {
  const gate = await requireRegistrar();
  if (gate.error) return gate;
  const { admin } = gate;

  const { data: student } = await admin
    .from("students")
    .select(
      `id, profile_id, activation_status, section_id, status, lrn, contact_number,
       parent_access_code_shown, emergency_contact_number,
       profiles(first_name, last_name),
       sections(section_name, grade_level)`
    )
    .eq("id", studentId)
    .maybeSingle();

  if (!student) return { error: "Student not found" };
  if (student.activation_status !== "pending") {
    return { error: "Student is not awaiting activation approval." };
  }

  if (approve) {
    const isEnrolled =
      student.status === "enrolled" ||
      student.status === "promoted" ||
      Boolean(student.section_id);

    if (!isEnrolled) {
      return {
        error:
          "Cannot activate — student is not enrolled yet. Assign a section / mark enrolled first.",
      };
    }

    const { data: link } = await admin
      .from("parent_student_links")
      .select("parent_id, parents(id, access_code, phone_number)")
      .eq("student_id", studentId)
      .maybeSingle();

    const parentPhone =
      link?.parents?.phone_number || student.emergency_contact_number;
    const studentName = [
      student.profiles?.first_name,
      student.profiles?.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    if (!parentPhone || normalizePhone(parentPhone).length < 10) {
      return {
        error:
          "Parent contact number is missing. Call and verify the parent number before approving.",
      };
    }
    await admin
      .from("students")
      .update({
        activation_status: "active",
        status: "enrolled",
      })
      .eq("id", studentId);

    if (student.profile_id) {
      await admin
        .from("profiles")
        .update({ status: "active" })
        .eq("id", student.profile_id);
    }

    const portalUrl = portalBaseUrl();
    const studentLoginUrl = `${portalUrl}/login/student`;

    try {
      await sendSMS({
        recipient: parentPhone,
        message: `${SCHOOL_SHORT}: ${studentName || "Your child"}'s student portal is activated. You will receive SMS alerts for absences and grade updates on this number. Keep it updated with the school.`,
        triggerType: "activation",
      });
    } catch {
      // non-blocking
    }

    if (student.contact_number) {
      try {
        await sendSMS({
          recipient: student.contact_number,
          message: `${SCHOOL_SHORT}: Your student portal is activated. Sign in at ${studentLoginUrl} with your LRN. IMPORTANT: Keep your contact number updated — the school uses it for notices. Grades and attendance appear after you are enrolled in a section/subjects.`,
          triggerType: "activation",
        });
      } catch {
        // non-blocking
      }
    }
  } else {
    await admin
      .from("students")
      .update({
        activation_status: "incomplete",
        // Keep contact details so student can correct and resubmit Phase 2
      })
      .eq("id", studentId);

    if (student.profile_id) {
      await admin
        .from("profiles")
        .update({ status: "pending" })
        .eq("id", student.profile_id);
    }

    if (student.contact_number) {
      try {
        await sendSMS({
          recipient: student.contact_number,
          message: `${SCHOOL_SHORT}: Your activation was returned by the registrar. Please sign in and update your personal/parent contact details, then resubmit. Accurate phone numbers are required.`,
          triggerType: "activation",
        });
      } catch {
        // non-blocking
      }
    }
  }

  revalidatePath("/registrar/activations");
  revalidatePath("/registrar");
  revalidatePath("/student");
  return { ok: true };
}

/** Registrar updates an activated (or listed) student + linked parent contacts */
export async function updateActivatedStudent(form) {
  const gate = await requireRegistrar();
  if (gate.error) return gate;
  const { admin } = gate;

  const studentId = form.studentId;
  const firstName = String(form.firstName || "").trim();
  const lastName = String(form.lastName || "").trim();
  const contactNumber = String(form.contactNumber || "").trim() || null;
  const personalEmail = String(form.personalEmail || "").trim() || null;
  const sectionId = form.sectionId || null;
  const parentFirstName = String(form.parentFirstName || "").trim();
  const parentLastName = String(form.parentLastName || "").trim();
  const parentPhone = String(form.parentPhone || "").trim() || null;
  const parentEmail = parseOptionalEmail({
    email: form.parentEmail,
    none: form.parentEmailNone,
  });

  if (!studentId) return { error: "Student id is required." };
  if (!firstName || !lastName) {
    return { error: "Student first and last name are required." };
  }

  const { data: student } = await admin
    .from("students")
    .select("id, profile_id, activation_status")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) return { error: "Student not found." };

  if (student.profile_id) {
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
      })
      .eq("id", student.profile_id);
    if (profileError) return { error: profileError.message };
  }

  const { error: studentError } = await admin
    .from("students")
    .update({
      contact_number: contactNumber,
      personal_email: personalEmail,
      section_id: sectionId,
      emergency_contact_number: parentPhone,
    })
    .eq("id", studentId);
  if (studentError) return { error: studentError.message };

  const { data: link } = await admin
    .from("parent_student_links")
    .select("parent_id, parents(id, profile_id)")
    .eq("student_id", studentId)
    .maybeSingle();

  if (link?.parents?.id) {
    const parentPatch = { email: parentEmail };
    if (parentPhone) parentPatch.phone_number = parentPhone;
    await admin.from("parents").update(parentPatch).eq("id", link.parents.id);
    if (link.parents.profile_id && (parentFirstName || parentLastName)) {
      const parentUpdate = {};
      if (parentFirstName) parentUpdate.first_name = parentFirstName;
      if (parentLastName) parentUpdate.last_name = parentLastName;
      await admin
        .from("profiles")
        .update(parentUpdate)
        .eq("id", link.parents.profile_id);
    }
  }

  revalidatePath("/registrar/activations");
  revalidatePath("/registrar/enrollment");
  revalidatePath("/student");
  return { ok: true };
}

/** Registrar permanently removes an activated student account */
export async function deleteActivatedStudent(studentId) {
  const gate = await requireRegistrar();
  if (gate.error) return gate;
  const { admin } = gate;

  if (!studentId) return { error: "Student id is required." };

  const { data: student } = await admin
    .from("students")
    .select("id, profile_id, activation_status")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) return { error: "Student not found." };

  await admin.from("parent_student_links").delete().eq("student_id", studentId);

  await admin.from("grades").delete().eq("student_id", studentId);
  await admin.from("attendance").delete().eq("student_id", studentId);

  const { error: studentError } = await admin
    .from("students")
    .delete()
    .eq("id", studentId);
  if (studentError) return { error: studentError.message };

  if (student.profile_id) {
    await admin.from("profiles").delete().eq("id", student.profile_id);
    try {
      await admin.auth.admin.deleteUser(student.profile_id);
    } catch {
      /* auth user may already be gone */
    }
  }

  revalidatePath("/registrar/activations");
  revalidatePath("/registrar/enrollment");
  revalidatePath("/registrar");
  return { ok: true };
}

/** Registrar creates / enrolls a student stub (LRN + birthdate + placement) */
export async function enrollStudentByRegistrar(form) {
  const gate = await requireRegistrar();
  if (gate.error) return gate;
  const { admin } = gate;

  const lrn = String(form.lrn || "").trim();
  const birthdate = String(form.birthdate || "").trim();
  const firstName = String(form.firstName || "").trim() || "Student";
  const lastName = String(form.lastName || "").trim() || lrn;
  const gender = String(form.gender || "Male").trim();
  const gradeLevel = Number(form.gradeLevel);
  const sectionId = form.sectionId || null;
  const password = formatBirthdatePassword(birthdate);

  if (!/^\d{12}$/.test(lrn)) return { error: "LRN must be exactly 12 digits." };
  if (!birthdate || birthdate.replaceAll("-", "").length < 8) {
    return { error: "Enter a valid birthdate." };
  }
  if (![7, 8, 9, 10, 11, 12].includes(gradeLevel)) {
    return { error: "Select a valid grade level." };
  }

  const email = studentEmailFromLrn(lrn);

  const { data: existing } = await admin
    .from("students")
    .select("id")
    .eq("lrn", lrn)
    .maybeSingle();
  if (existing) return { error: "A student with this LRN already exists." };

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "student", first_name: firstName, last_name: lastName },
    });

  if (createError) return { error: createError.message };
  const userId = created.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    role: "student",
    first_name: firstName,
    last_name: lastName,
    email,
    status: "active",
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: profileError.message };
  }

  const { error: studentError } = await admin.from("students").insert({
    profile_id: userId,
    lrn,
    birthdate,
    gender,
    grade_level: gradeLevel,
    section_id: sectionId,
    status: "enrolled",
    activation_status: "active",
  });

  if (studentError) {
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
    return { error: studentError.message };
  }

  revalidatePath("/registrar/students");
  revalidatePath("/registrar/enrollment");
  revalidatePath("/registrar/activations");
  revalidatePath("/registrar/academics");
  return {
    ok: true,
    message: `Enrolled and activated LRN ${lrn}. Sign in at Student Login with LRN and birthdate (YYYYMMDD) as the password.`,
    lrn,
  };
}

/**
 * Registrar creates a teacher account (active by default) so they can sign in
 * without waiting for self-registration approval.
 */
export async function createTeacherByRegistrar(form) {
  const gate = await requireRegistrar();
  if (gate.error) return gate;
  const { admin } = gate;

  const firstName = String(form.firstName || "").trim();
  const lastName = String(form.lastName || "").trim();
  const email = String(form.email || "").trim().toLowerCase();
  const facultyDept = String(form.facultyDept || "").trim() || null;
  const departmentId = form.departmentId || null;
  const facultyPosition = String(form.facultyPosition || "teacher").trim();
  const tempPassword = String(form.password || "").trim();
  const password =
    tempPassword.length >= 8
      ? tempPassword
      : `Teach-${crypto.randomUUID().slice(0, 10)}!`;

  const allowedPositions = new Set(FACULTY_POSITIONS.map((p) => p.value));
  const position = allowedPositions.has(facultyPosition)
    ? facultyPosition
    : "teacher";

  if (!firstName || !lastName) {
    return { error: "First and last name are required." };
  }
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingProfile) {
    return { error: "A user with this email already exists." };
  }

  let teacherId;
  try {
    teacherId = await generateTeacherId(admin);
  } catch (err) {
    return { error: err?.message || "Could not generate Teacher ID." };
  }

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
    status: "active",
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: profileError.message };
  }

  const teacherPayload = {
    profile_id: userId,
    teacher_id: teacherId,
    faculty_dept: facultyDept,
    faculty_position: position,
    units: 0,
  };
  if (departmentId) teacherPayload.department_id = departmentId;

  const { error: teacherError } = await admin
    .from("teachers")
    .insert(teacherPayload);

  if (teacherError) {
    // Retry without optional columns if schema is older
    if (/department_id|faculty_position/i.test(teacherError.message || "")) {
      const { error: retryErr } = await admin.from("teachers").insert({
        profile_id: userId,
        teacher_id: teacherId,
        faculty_dept: facultyDept,
        units: 0,
      });
      if (retryErr) {
        await admin.from("profiles").delete().eq("id", userId);
        await admin.auth.admin.deleteUser(userId);
        return { error: retryErr.message };
      }
    } else {
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      return { error: teacherError.message };
    }
  }

  revalidatePath("/registrar/teachers");
  revalidatePath("/registrar/academics");
  return {
    ok: true,
    teacherId,
    email,
    temporaryPassword: password,
    message: `Teacher ${teacherId} created and active. They can sign in with email or Teacher ID.`,
  };
}

/** Registrar updates teacher profile, sign-in email, optional password, and faculty post. */
export async function updateTeacherByRegistrar(form) {
  const gate = await requireRegistrar();
  if (gate.error) return gate;
  const { admin } = gate;

  const id = String(form.id || form.teacherRowId || "").trim();
  const firstName = String(form.firstName || "").trim();
  const lastName = String(form.lastName || "").trim();
  const email = String(form.email || "").trim().toLowerCase();
  const facultyDept = String(form.facultyDept || "").trim() || null;
  const departmentId = form.departmentId || null;
  const facultyPosition = String(form.facultyPosition || "teacher").trim();
  const nextPassword = String(form.password || "").trim();

  const allowedPositions = new Set(FACULTY_POSITIONS.map((p) => p.value));
  const position = allowedPositions.has(facultyPosition)
    ? facultyPosition
    : "teacher";

  if (!id) return { error: "Teacher is required." };
  if (!firstName || !lastName) {
    return { error: "First and last name are required." };
  }
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  if (nextPassword && nextPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  const { data: teacher } = await admin
    .from("teachers")
    .select("id, profile_id, teacher_id")
    .eq("id", id)
    .maybeSingle();
  if (!teacher?.profile_id) return { error: "Teacher not found." };

  const { data: emailOwner } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (emailOwner?.id && emailOwner.id !== teacher.profile_id) {
    return { error: "A user with this email already exists." };
  }

  const authPatch = {
    email,
    email_confirm: true,
    user_metadata: {
      role: "teacher",
      first_name: firstName,
      last_name: lastName,
    },
  };
  if (nextPassword) authPatch.password = nextPassword;

  const { error: authError } = await admin.auth.admin.updateUserById(
    teacher.profile_id,
    authPatch
  );
  if (authError) return { error: authError.message };

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      email,
    })
    .eq("id", teacher.profile_id);
  if (profileError) return { error: profileError.message };

  const teacherPatch = {
    faculty_dept: facultyDept,
    faculty_position: position,
    department_id: departmentId || null,
  };
  const { error: teacherError } = await admin
    .from("teachers")
    .update(teacherPatch)
    .eq("id", teacher.id);

  if (
    teacherError &&
    /department_id|faculty_position/i.test(teacherError.message || "")
  ) {
    const { error: retryErr } = await admin
      .from("teachers")
      .update({ faculty_dept: facultyDept })
      .eq("id", teacher.id);
    if (retryErr) return { error: retryErr.message };
  } else if (teacherError) {
    return { error: teacherError.message };
  }

  revalidatePath("/registrar/teachers");
  revalidatePath("/registrar/academics");
  revalidatePath("/teacher");
  return {
    ok: true,
    message: nextPassword
      ? `Updated ${teacher.teacher_id}. Share the new password if you changed it.`
      : `Updated ${teacher.teacher_id}.`,
  };
}

/** Registrar permanently removes a teacher account and teaching loads. */
export async function deleteTeacherByRegistrar(teacherId) {
  const gate = await requireRegistrar();
  if (gate.error) return gate;
  const { admin } = gate;

  const id = String(teacherId || "").trim();
  if (!id) return { error: "Teacher is required." };

  const { data: teacher } = await admin
    .from("teachers")
    .select("id, profile_id, teacher_id")
    .eq("id", id)
    .maybeSingle();
  if (!teacher) return { error: "Teacher not found." };

  await admin.from("sections").update({ adviser_id: null }).eq("adviser_id", id);
  await admin.from("teacher_assignments").delete().eq("teacher_id", id);
  await admin.from("announcements").delete().eq("teacher_id", id);
  await admin
    .from("evaluations")
    .update({ target_teacher_id: null })
    .eq("target_teacher_id", id);

  const { error: teacherError } = await admin
    .from("teachers")
    .delete()
    .eq("id", id);
  if (teacherError) return { error: teacherError.message };

  if (teacher.profile_id) {
    await admin.from("profiles").delete().eq("id", teacher.profile_id);
    try {
      await admin.auth.admin.deleteUser(teacher.profile_id);
    } catch {
      /* auth user may already be gone */
    }
  }

  revalidatePath("/registrar/teachers");
  revalidatePath("/registrar/academics");
  revalidatePath("/teacher");
  return {
    ok: true,
    message: `Removed ${teacher.teacher_id || "teacher"} and their teaching loads.`,
  };
}

export async function createSubject(form) {
  const gate = await requireRegistrar();
  if (gate.error) return gate;

  const subjectName = String(form.subjectName || "").trim();
  const gradeLevel = Number(form.gradeLevel);
  const trackStrand = String(form.trackStrand || "").trim() || null;
  const writtenWeight = Number(form.writtenWeight ?? 40);
  const performanceWeight = Number(form.performanceWeight ?? 40);
  const assessmentWeight = Number(form.assessmentWeight ?? 20);

  if (!subjectName) return { error: "Subject name is required." };
  if (![7, 8, 9, 10, 11, 12].includes(gradeLevel)) {
    return { error: "Select a valid grade level." };
  }
  if (writtenWeight + performanceWeight + assessmentWeight !== 100) {
    return { error: "DepEd weights must total 100." };
  }

  const { error } = await gate.supabase.from("subjects").insert({
    subject_name: subjectName,
    grade_level: gradeLevel,
    track_strand: trackStrand,
    written_weight: writtenWeight,
    performance_weight: performanceWeight,
    assessment_weight: assessmentWeight,
  });

  if (error) return { error: error.message };
  revalidatePath("/registrar/academics");
  return { ok: true };
}

export async function createSection(form) {
  const gate = await requireRegistrar();
  if (gate.error) return gate;

  const sectionName = String(form.sectionName || "").trim();
  const gradeLevel = Number(form.gradeLevel);
  const schoolYear = String(form.schoolYear || SCHOOL_YEAR_DEFAULT).trim();
  const adviserId = form.adviserId || null;

  if (!sectionName) return { error: "Section name is required." };
  if (![7, 8, 9, 10, 11, 12].includes(gradeLevel)) {
    return { error: "Select a valid grade level." };
  }

  const trackStrand = isSeniorHighGrade(gradeLevel)
    ? String(form.trackStrand || "").trim() || null
    : null;

  const { error } = await gate.supabase.from("sections").insert({
    section_name: sectionName,
    grade_level: gradeLevel,
    school_year: schoolYear,
    adviser_id: adviserId,
    track_strand: trackStrand,
    capacity: 45,
  });

  if (error) return { error: error.message };
  revalidatePath("/registrar/academics");
  revalidatePath("/registrar/enrollment");
  return { ok: true };
}

function optionalInt(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function updateSection(form) {
  const gate = await requireRegistrar();
  if (gate.error) return gate;

  const id = form.id;
  const sectionName = String(form.sectionName || "").trim();
  const gradeLevel = Number(form.gradeLevel);
  const schoolYear = String(form.schoolYear || SCHOOL_YEAR_DEFAULT).trim();
  const adviserId = form.adviserId || null;
  const trackStrand = String(form.trackStrand || "").trim() || null;
  const location = String(form.location || "").trim() || null;
  const capacity = optionalInt(form.capacity);
  const maleCount = optionalInt(form.maleCount);
  const femaleCount = optionalInt(form.femaleCount);

  if (!id) return { error: "Section id is required." };
  if (!sectionName) return { error: "Section name is required." };
  if (![7, 8, 9, 10, 11, 12].includes(gradeLevel)) {
    return { error: "Select a valid grade level." };
  }

  let adviserName = String(form.adviserName || "").trim() || null;
  if (adviserId) {
    const { data: teacher } = await gate.supabase
      .from("teachers")
      .select("profiles(first_name, last_name)")
      .eq("id", adviserId)
      .maybeSingle();
    const full = `${teacher?.profiles?.first_name || ""} ${teacher?.profiles?.last_name || ""}`.trim();
    if (full) adviserName = full;
  }

  const { error } = await gate.supabase
    .from("sections")
    .update({
      section_name: sectionName,
      grade_level: gradeLevel,
      school_year: schoolYear,
      adviser_id: adviserId,
      adviser_name: adviserName,
      track_strand: trackStrand,
      location,
      capacity,
      male_count: maleCount,
      female_count: femaleCount,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/registrar/academics");
  revalidatePath("/registrar/enrollment");
  return { ok: true };
}

export async function deleteSection(id) {
  const gate = await requireRegistrar();
  if (gate.error) return gate;
  if (!id) return { error: "Section id is required." };

  await gate.supabase
    .from("students")
    .update({ section_id: null })
    .eq("section_id", id);

  await gate.supabase.from("teacher_assignments").delete().eq("section_id", id);

  const { error } = await gate.supabase.from("sections").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/registrar/academics");
  revalidatePath("/registrar/enrollment");
  revalidatePath("/registrar/teachers");
  revalidatePath("/teacher");
  return { ok: true };
}

export async function assignTeacher(form) {
  const gate = await requireRegistrar();
  if (gate.error) return gate;

  const teacherId = form.teacherId;
  const sectionId = form.sectionId;
  const subjectId = form.subjectId;
  const schoolYear = String(form.schoolYear || SCHOOL_YEAR_DEFAULT).trim();

  if (!teacherId || !sectionId || !subjectId) {
    return { error: "Select teacher, section, and subject." };
  }

  const { error } = await gate.supabase.from("teacher_assignments").upsert(
    {
      teacher_id: teacherId,
      section_id: sectionId,
      subject_id: subjectId,
      school_year: schoolYear,
    },
    { onConflict: "teacher_id,section_id,subject_id,school_year" }
  );

  if (error) return { error: error.message };
  revalidatePath("/registrar/academics");
  revalidatePath("/registrar/teachers");
  revalidatePath("/teacher");
  return { ok: true };
}

export async function removeTeacherAssignment(id) {
  const gate = await requireRegistrar();
  if (gate.error) return gate;

  const { error } = await gate.supabase
    .from("teacher_assignments")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/registrar/academics");
  revalidatePath("/teacher");
  return { ok: true };
}
