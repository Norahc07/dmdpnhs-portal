"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SCHOOL_SHORT } from "@/lib/constants";
import { sendSMS } from "@/lib/semaphore";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function revalidateProfilePaths(role) {
  if (role === "student") {
    revalidatePath("/student");
    revalidatePath("/student/profile");
    revalidatePath("/student/activate");
  } else if (role === "teacher") {
    revalidatePath("/teacher");
    revalidatePath("/teacher/profile");
  }
}

async function requireAuthedProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return { error: "Profile not found." };
  return { supabase, user, profile };
}

function extensionFor(type) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

/**
 * When parent/emergency phone changes: update the linked guardian contact
 * and SMS that absence/grade alerts will go to the new number.
 */
async function updateGuardianPhoneForStudent({
  admin,
  studentId,
  studentName,
  newPhone,
}) {
  const digits = normalizePhone(newPhone);
  if (digits.length < 10) {
    return { error: "Enter a valid parent contact number." };
  }

  const { data: link } = await admin
    .from("parent_student_links")
    .select("parent_id, parents(id, phone_number)")
    .eq("student_id", studentId)
    .maybeSingle();

  let parent = link?.parents || null;

  if (!parent) {
    const { data: student } = await admin
      .from("students")
      .select("parent_access_code_shown")
      .eq("id", studentId)
      .maybeSingle();

    if (student?.parent_access_code_shown) {
      const { data: byCode } = await admin
        .from("parents")
        .select("id, phone_number")
        .eq("access_code", student.parent_access_code_shown)
        .maybeSingle();
      parent = byCode;
    }
  }

  if (!parent?.id) {
    return {
      skipped: true,
      reason: "no_parent_linked",
    };
  }

  const { error: parentUpdateError } = await admin
    .from("parents")
    .update({ phone_number: newPhone })
    .eq("id", parent.id);

  if (parentUpdateError) return { error: parentUpdateError.message };

  const sms = await sendSMS({
    recipient: newPhone,
    message: `${SCHOOL_SHORT}: Guardian contact number updated for ${studentName || "your child"}. Absence and grade SMS alerts will be sent to this number.`,
    triggerType: "activation",
  });

  return {
    ok: true,
    smsSent: sms.ok,
    smsError: sms.error || null,
  };
}

export async function uploadProfileAvatar(formData) {
  const auth = await requireAuthedProfile();
  if (auth.error) return { error: auth.error };

  const { user, profile } = auth;
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose or capture a photo first." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Use a JPG, PNG, WebP, or GIF image." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Photo must be 5 MB or smaller." };
  }

  const admin = createAdminClient();
  const ext = extensionFor(file.type);
  const path = `${user.id}/avatar.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    return {
      error:
        uploadError.message.includes("Bucket not found")
          ? "Avatar storage is not set up yet. Run supabase/profile-upgrade.sql in Supabase."
          : uploadError.message,
    };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await admin
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

  revalidateProfilePaths(profile.role);
  return { ok: true, avatarUrl };
}

export async function removeProfileAvatar() {
  const auth = await requireAuthedProfile();
  if (auth.error) return { error: auth.error };

  const { user, profile } = auth;
  const admin = createAdminClient();

  await admin.storage.from("avatars").remove([
    `${user.id}/avatar.jpg`,
    `${user.id}/avatar.jpeg`,
    `${user.id}/avatar.png`,
    `${user.id}/avatar.webp`,
    `${user.id}/avatar.gif`,
  ]);

  const { error } = await admin
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidateProfilePaths(profile.role);
  return { ok: true };
}

export async function updateStudentProfile(payload) {
  const auth = await requireAuthedProfile();
  if (auth.error) return { error: auth.error };
  if (auth.profile.role !== "student") return { error: "Unauthorized" };

  const firstName = String(payload.firstName || "").trim();
  const middleName = String(payload.middleName || "").trim();
  const lastName = String(payload.lastName || "").trim();
  const contactNumber = String(payload.contactNumber || "").trim();
  const personalEmail = String(payload.personalEmail || "").trim();
  const address = String(payload.address || "").trim();
  const emergencyContactName = String(
    payload.emergencyContactName || ""
  ).trim();
  const emergencyContactNumber = String(
    payload.emergencyContactNumber || ""
  ).trim();

  if (!firstName || !lastName) {
    return { error: "First and last name are required." };
  }
  if (!contactNumber) {
    return { error: "Your contact number is required." };
  }

  const admin = createAdminClient();

  const { data: student } = await admin
    .from("students")
    .select("id, emergency_contact_number, parent_access_code_shown")
    .eq("profile_id", auth.user.id)
    .maybeSingle();

  if (!student?.id) {
    return { error: "Student record not found." };
  }

  const previousParentPhone = normalizePhone(student.emergency_contact_number);
  const nextParentPhone = normalizePhone(emergencyContactNumber);
  const parentPhoneChanged =
    Boolean(nextParentPhone) &&
    nextParentPhone.length >= 10 &&
    nextParentPhone !== previousParentPhone;

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
    })
    .eq("id", auth.user.id);

  if (profileError) return { error: profileError.message };

  const { error: studentError } = await admin
    .from("students")
    .update({
      contact_number: contactNumber,
      personal_email: personalEmail || null,
      address: address || null,
      emergency_contact_name: emergencyContactName || null,
      emergency_contact_number: emergencyContactNumber || null,
    })
    .eq("profile_id", auth.user.id);

  if (studentError) return { error: studentError.message };

  let parentAccessUpdated = false;
  let parentSmsSent = false;

  if (parentPhoneChanged) {
    const studentName = [firstName, lastName].filter(Boolean).join(" ");
    const rotated = await updateGuardianPhoneForStudent({
      admin,
      studentId: student.id,
      studentName,
      newPhone: emergencyContactNumber,
    });

    if (rotated?.error) {
      return {
        error: `Profile saved, but guardian contact could not be updated: ${rotated.error}`,
      };
    }

    if (rotated?.ok) {
      parentAccessUpdated = true;
      parentSmsSent = Boolean(rotated.smsSent);
    }
  }

  revalidateProfilePaths("student");
  return {
    ok: true,
    parentAccessUpdated,
    parentSmsSent,
  };
}

export async function updateTeacherProfile(payload) {
  const auth = await requireAuthedProfile();
  if (auth.error) return { error: auth.error };
  if (auth.profile.role !== "teacher") return { error: "Unauthorized" };

  const firstName = String(payload.firstName || "").trim();
  const middleName = String(payload.middleName || "").trim();
  const lastName = String(payload.lastName || "").trim();
  const contactNumber = String(payload.contactNumber || "").trim();
  const personalEmail = String(payload.personalEmail || "").trim();
  const address = String(payload.address || "").trim();
  const birthdate = String(payload.birthdate || "").trim();
  const gender = String(payload.gender || "").trim();
  const facultyDept = String(payload.facultyDept || "").trim();

  if (!firstName || !lastName) {
    return { error: "First and last name are required." };
  }
  if (!contactNumber) {
    return { error: "Your contact number is required." };
  }

  const admin = createAdminClient();
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
    })
    .eq("id", auth.user.id);

  if (profileError) return { error: profileError.message };

  const { error: teacherError } = await admin
    .from("teachers")
    .update({
      contact_number: contactNumber,
      personal_email: personalEmail || null,
      address: address || null,
      birthdate: birthdate || null,
      gender: gender || null,
      faculty_dept: facultyDept || null,
    })
    .eq("profile_id", auth.user.id);

  if (teacherError) return { error: teacherError.message };

  revalidateProfilePaths("teacher");
  return { ok: true };
}
