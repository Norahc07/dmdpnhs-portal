"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  ANNOUNCEMENT_SQL_HINT,
  ANNOUNCEMENT_TYPES,
  isAnnouncementTableMissing,
  loadTeacherHandledSections,
  mapAnnouncementRow,
} from "@/lib/announcements";

const SELECT_POST = `
  id, teacher_id, author_profile_id, post_type, title, body, created_at, updated_at,
  profiles ( first_name, last_name ),
  announcement_targets ( section_id, sections ( id, section_name, grade_level ) ),
  announcement_attachments ( id, file_name, file_path, file_url, file_size, content_type )
`;

const MAX_FILES = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "doc",
  "docx",
]);

function revalidateAnnouncementPaths() {
  revalidatePath("/teacher/announcements");
  revalidatePath("/teacher");
  revalidatePath("/student/announcements");
  revalidatePath("/student");
}

function missingHint(error) {
  if (isAnnouncementTableMissing(error)) return { error: ANNOUNCEMENT_SQL_HINT };
  return { error: error?.message || "Could not save the announcement." };
}

async function requireTeacher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "teacher") {
    return { error: "Only educators can manage announcements." };
  }

  const admin = createAdminClient();
  const { data: teacher } = await admin
    .from("teachers")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!teacher?.id) return { error: "Teacher record not found." };

  return { admin, profile, teacherId: teacher.id };
}

async function requireStudent() {
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
  if (!profile || profile.role !== "student") {
    return { error: "Students only" };
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .from("students")
    .select("id, section_id, activation_status")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!student?.id) return { error: "Student record not found." };

  return { admin, profile, student };
}

function parseSectionIds(formData) {
  const raw = formData.getAll?.("sectionIds") || [];
  return [...new Set(raw.map((value) => String(value || "").trim()).filter(Boolean))];
}

function parseFiles(formData) {
  const files = formData.getAll?.("attachments") || [];
  return files.filter((file) => file && typeof file === "object" && file.size > 0);
}

async function assertTeacherOwnsSections(admin, teacherId, sectionIds) {
  const allowed = await loadTeacherHandledSections(admin, teacherId);
  const allowedIds = new Set(allowed.map((section) => section.id));
  const invalid = sectionIds.filter((id) => !allowedIds.has(id));
  if (invalid.length) {
    return { error: "You can only post to sections you handle." };
  }
  return { ok: true, sections: allowed.filter((s) => sectionIds.includes(s.id)) };
}

async function uploadAttachments(admin, announcementId, files) {
  if (!files.length) return [];
  if (files.length > MAX_FILES) {
    return { error: `Attach up to ${MAX_FILES} files.` };
  }

  const saved = [];
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return { error: `${file.name || "File"} must be 5 MB or smaller.` };
    }
    const ext = String(file.name || "file").split(".").pop()?.toLowerCase() || "bin";
    if (!ALLOWED_EXT.has(ext)) {
      return { error: "Upload a PDF, Word file, or image (JPG, PNG, WebP)." };
    }
    const safeName = String(file.name || `attachment.${ext}`).replace(/[^\w.\-]+/g, "_");
    const filePath = `${announcementId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await admin.storage
      .from("announcement-files")
      .upload(filePath, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
    if (uploadError) {
      console.error("[announcements] upload", uploadError.message);
      return {
        error:
          "Could not save the attachment. Confirm the announcement-files storage bucket exists.",
      };
    }
    const { data: publicData } = admin.storage
      .from("announcement-files")
      .getPublicUrl(filePath);
    saved.push({
      announcement_id: announcementId,
      file_name: file.name || safeName,
      file_path: filePath,
      file_url: publicData?.publicUrl || null,
      file_size: file.size || null,
      content_type: file.type || null,
    });
  }
  return saved;
}

async function notifyTargetStudents(admin, announcementId, sectionIds) {
  if (!sectionIds.length) return;
  const { data: students } = await admin
    .from("students")
    .select("id")
    .in("section_id", sectionIds)
    .eq("activation_status", "active");

  const rows = (students || []).map((student) => ({
    announcement_id: announcementId,
    student_id: student.id,
  }));
  if (!rows.length) return;

  const { error } = await admin
    .from("announcement_notifications")
    .upsert(rows, { onConflict: "announcement_id,student_id", ignoreDuplicates: true });
  if (error && !isAnnouncementTableMissing(error)) {
    console.error("[announcements] notify", error.message);
  }
}

export async function createAnnouncement(formData) {
  const auth = await requireTeacher();
  if (auth.error) return auth;

  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const postType = String(formData.get("postType") || "announcement").trim();
  const sectionIds = parseSectionIds(formData);
  const files = parseFiles(formData);

  if (!ANNOUNCEMENT_TYPES.some((item) => item.value === postType)) {
    return { error: "Choose a valid post type." };
  }
  if (title.length < 3) return { error: "Enter a title of at least 3 characters." };
  if (body.length < 8) return { error: "Enter announcement details." };
  if (!sectionIds.length) return { error: "Select at least one target section." };

  const owned = await assertTeacherOwnsSections(
    auth.admin,
    auth.teacherId,
    sectionIds
  );
  if (owned.error) return owned;

  const { data: post, error } = await auth.admin
    .from("announcements")
    .insert({
      teacher_id: auth.teacherId,
      author_profile_id: auth.profile.id,
      post_type: postType,
      title,
      body,
    })
    .select("id")
    .single();

  if (error) return missingHint(error);

  const { error: targetError } = await auth.admin
    .from("announcement_targets")
    .insert(sectionIds.map((sectionId) => ({ announcement_id: post.id, section_id: sectionId })));
  if (targetError) {
    await auth.admin.from("announcements").delete().eq("id", post.id);
    return missingHint(targetError);
  }

  const uploaded = await uploadAttachments(auth.admin, post.id, files);
  if (uploaded.error) {
    await auth.admin.from("announcements").delete().eq("id", post.id);
    return uploaded;
  }
  if (uploaded.length) {
    const { error: attachError } = await auth.admin
      .from("announcement_attachments")
      .insert(uploaded);
    if (attachError) return missingHint(attachError);
  }

  await notifyTargetStudents(auth.admin, post.id, sectionIds);
  revalidateAnnouncementPaths();
  return { ok: true, id: post.id };
}

export async function updateAnnouncement(formData) {
  const auth = await requireTeacher();
  if (auth.error) return auth;

  const id = String(formData.get("id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const postType = String(formData.get("postType") || "announcement").trim();
  const sectionIds = parseSectionIds(formData);
  const files = parseFiles(formData);

  if (!id) return { error: "Missing announcement." };
  if (!ANNOUNCEMENT_TYPES.some((item) => item.value === postType)) {
    return { error: "Choose a valid post type." };
  }
  if (title.length < 3) return { error: "Enter a title of at least 3 characters." };
  if (body.length < 8) return { error: "Enter announcement details." };
  if (!sectionIds.length) return { error: "Select at least one target section." };

  const { data: existing, error: findError } = await auth.admin
    .from("announcements")
    .select("id, teacher_id, author_profile_id")
    .eq("id", id)
    .maybeSingle();
  if (findError) return missingHint(findError);
  if (!existing) return { error: "Announcement not found." };
  if (existing.author_profile_id !== auth.profile.id) {
    return { error: "You can only edit posts you authored." };
  }

  const owned = await assertTeacherOwnsSections(
    auth.admin,
    auth.teacherId,
    sectionIds
  );
  if (owned.error) return owned;

  const { error: updateError } = await auth.admin
    .from("announcements")
    .update({
      post_type: postType,
      title,
      body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updateError) return missingHint(updateError);

  const { data: previousTargets } = await auth.admin
    .from("announcement_targets")
    .select("section_id")
    .eq("announcement_id", id);
  const previousIds = new Set((previousTargets || []).map((row) => row.section_id));

  await auth.admin.from("announcement_targets").delete().eq("announcement_id", id);
  const { error: targetError } = await auth.admin
    .from("announcement_targets")
    .insert(sectionIds.map((sectionId) => ({ announcement_id: id, section_id: sectionId })));
  if (targetError) return missingHint(targetError);

  const uploaded = await uploadAttachments(auth.admin, id, files);
  if (uploaded.error) return uploaded;
  if (uploaded.length) {
    const { error: attachError } = await auth.admin
      .from("announcement_attachments")
      .insert(uploaded);
    if (attachError) return missingHint(attachError);
  }

  const addedSections = sectionIds.filter((sectionId) => !previousIds.has(sectionId));
  if (addedSections.length) {
    await notifyTargetStudents(auth.admin, id, addedSections);
  }

  revalidateAnnouncementPaths();
  return { ok: true, id };
}

export async function deleteAnnouncement(announcementId) {
  const auth = await requireTeacher();
  if (auth.error) return auth;
  const id = String(announcementId || "").trim();
  if (!id) return { error: "Missing announcement." };

  const { data: existing, error: findError } = await auth.admin
    .from("announcements")
    .select("id, author_profile_id")
    .eq("id", id)
    .maybeSingle();
  if (findError) return missingHint(findError);
  if (!existing) return { error: "Announcement not found." };
  if (existing.author_profile_id !== auth.profile.id) {
    return { error: "You can only delete posts you authored." };
  }

  const { data: attachments } = await auth.admin
    .from("announcement_attachments")
    .select("file_path")
    .eq("announcement_id", id);
  const paths = (attachments || []).map((row) => row.file_path).filter(Boolean);
  if (paths.length) {
    await auth.admin.storage.from("announcement-files").remove(paths);
  }

  const { error } = await auth.admin.from("announcements").delete().eq("id", id);
  if (error) return missingHint(error);

  revalidateAnnouncementPaths();
  return { ok: true };
}

export async function deleteAnnouncementAttachment({ announcementId, attachmentId }) {
  const auth = await requireTeacher();
  if (auth.error) return auth;

  const { data: post } = await auth.admin
    .from("announcements")
    .select("id, author_profile_id")
    .eq("id", announcementId)
    .maybeSingle();
  if (!post || post.author_profile_id !== auth.profile.id) {
    return { error: "You can only edit posts you authored." };
  }

  const { data: attachment } = await auth.admin
    .from("announcement_attachments")
    .select("id, file_path")
    .eq("id", attachmentId)
    .eq("announcement_id", announcementId)
    .maybeSingle();
  if (!attachment) return { error: "Attachment not found." };

  if (attachment.file_path) {
    await auth.admin.storage.from("announcement-files").remove([attachment.file_path]);
  }
  const { error } = await auth.admin
    .from("announcement_attachments")
    .delete()
    .eq("id", attachmentId);
  if (error) return missingHint(error);

  revalidateAnnouncementPaths();
  return { ok: true };
}

export async function listTeacherAnnouncements() {
  const auth = await requireTeacher();
  if (auth.error) return { ...auth, posts: [], sections: [] };

  const sections = await loadTeacherHandledSections(auth.admin, auth.teacherId);
  const { data, error } = await auth.admin
    .from("announcements")
    .select(SELECT_POST)
    .eq("teacher_id", auth.teacherId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isAnnouncementTableMissing(error)) {
      return { posts: [], sections, hint: ANNOUNCEMENT_SQL_HINT };
    }
    return { error: error.message, posts: [], sections };
  }

  return {
    posts: (data || []).map(mapAnnouncementRow),
    sections,
  };
}

export async function countUnreadAnnouncements(studentId) {
  if (!studentId) return 0;
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("announcement_notifications")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .is("read_at", null);
  if (error) return 0;
  return count || 0;
}

export async function listStudentAnnouncements() {
  const auth = await requireStudent();
  if (auth.error) return { ...auth, posts: [], unreadCount: 0 };
  if (!auth.student.section_id) {
    return { posts: [], unreadCount: 0 };
  }

  const { data: targets, error: targetError } = await auth.admin
    .from("announcement_targets")
    .select("announcement_id")
    .eq("section_id", auth.student.section_id);
  if (targetError) {
    if (isAnnouncementTableMissing(targetError)) {
      return { posts: [], unreadCount: 0, hint: ANNOUNCEMENT_SQL_HINT };
    }
    return { error: targetError.message, posts: [], unreadCount: 0 };
  }

  const ids = [...new Set((targets || []).map((row) => row.announcement_id))];
  if (!ids.length) return { posts: [], unreadCount: 0 };

  const { data, error } = await auth.admin
    .from("announcements")
    .select(SELECT_POST)
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (error) return missingHint(error);

  const { data: notices } = await auth.admin
    .from("announcement_notifications")
    .select("announcement_id, read_at")
    .eq("student_id", auth.student.id)
    .in("announcement_id", ids);

  const unread = new Set(
    (notices || [])
      .filter((row) => !row.read_at)
      .map((row) => row.announcement_id)
  );

  const posts = (data || []).map((row) =>
    mapAnnouncementRow({ ...row, unread: unread.has(row.id) })
  );
  posts.sort((a, b) => Number(b.unread) - Number(a.unread) || 0);

  return {
    posts,
    unreadCount: unread.size,
  };
}

export async function getStudentAnnouncement(announcementId) {
  const list = await listStudentAnnouncements();
  if (list.error) return list;
  const post = (list.posts || []).find((item) => item.id === announcementId);
  if (!post) return { error: "This announcement is not available for your section." };
  return { post, unreadCount: list.unreadCount };
}

export async function markAnnouncementRead(announcementId) {
  const auth = await requireStudent();
  if (auth.error) return auth;
  const id = String(announcementId || "").trim();
  if (!id) return { error: "Missing announcement." };

  const { error } = await auth.admin
    .from("announcement_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("announcement_id", id)
    .eq("student_id", auth.student.id)
    .is("read_at", null);

  if (error && !isAnnouncementTableMissing(error)) {
    return { error: error.message };
  }

  revalidatePath("/student/announcements");
  revalidatePath("/student");
  return { ok: true };
}
