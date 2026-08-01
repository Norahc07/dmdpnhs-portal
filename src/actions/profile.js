"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

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

  revalidateProfilePaths("student");
  return { ok: true };
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
