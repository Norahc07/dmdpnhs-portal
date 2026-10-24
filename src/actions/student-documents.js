"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { loadTeacherHandledSections, sectionLabel } from "@/lib/announcements";
import { getTeacherAccess } from "@/lib/teacher-access";
import {
  DOCUMENT_SQL_HINT,
  REQUIRED_DOCUMENTS,
  canStudentReplaceDocument,
  documentStatusLabel,
  isStudentDocumentsTableMissing,
  learnerDisplayName,
  requiredDocumentByKey,
} from "@/lib/student-documents";

const BUCKET = "student-documents";
const REVIEW_STATUSES = ["under_review", "approved", "needs_revision"];

function revalidateDocumentPages() {
  revalidatePath("/student/requests");
  revalidatePath("/teacher/documents");
  revalidatePath("/registrar/requests");
}

async function getSessionProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { error: "Unauthorized" };
  return { admin, profile };
}

async function teacherSectionIds(admin, profileId) {
  const access = await getTeacherAccess(admin, profileId);
  if (!access.teacherId) return [];
  const sections = await loadTeacherHandledSections(admin, access.teacherId);
  return sections.map((section) => section.id);
}

async function canManageStudent(admin, profile, studentId) {
  if (profile.role === "registrar") return true;
  if (profile.role !== "teacher") return false;
  const { data: student } = await admin
    .from("students")
    .select("id, section_id")
    .eq("id", studentId)
    .maybeSingle();
  if (!student?.section_id) return false;
  const sectionIds = await teacherSectionIds(admin, profile.id);
  return sectionIds.includes(student.section_id);
}

function mapSubmission(row) {
  const spec = requiredDocumentByKey(row.doc_key);
  return {
    id: row.id,
    docKey: row.doc_key,
    label: spec?.label || row.doc_key,
    required: Boolean(spec?.required),
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    status: row.status,
    statusLabel: documentStatusLabel(row.status),
    reviewerNotes: row.reviewer_notes || "",
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
  };
}

function emptySubmission(spec) {
  return {
    id: null,
    docKey: spec.key,
    label: spec.label,
    required: spec.required,
    description: spec.description,
    fileName: null,
    filePath: null,
    fileSize: null,
    status: "not_submitted",
    statusLabel: documentStatusLabel("not_submitted"),
    reviewerNotes: "",
    submittedAt: null,
    reviewedAt: null,
  };
}

export async function listStudentRequiredDocuments() {
  const auth = await getSessionProfile();
  if (auth.error) return { error: auth.error };
  const { admin, profile } = auth;
  if (profile.role !== "student") return { error: "Unauthorized" };

  const { data: student } = await admin
    .from("students")
    .select("id, activation_status")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!student?.id) return { error: "Student record not found." };

  const { data, error } = await admin
    .from("student_documents")
    .select(
      "id, doc_key, file_name, file_path, file_size, status, reviewer_notes, submitted_at, reviewed_at"
    )
    .eq("student_id", student.id);

  if (error) {
    if (isStudentDocumentsTableMissing(error)) {
      return {
        hint: DOCUMENT_SQL_HINT,
        studentId: student.id,
        items: REQUIRED_DOCUMENTS.map(emptySubmission),
      };
    }
    return { error: error.message };
  }

  const byKey = new Map((data || []).map((row) => [row.doc_key, row]));
  const items = REQUIRED_DOCUMENTS.map((spec) => {
    const row = byKey.get(spec.key);
    return row
      ? { ...mapSubmission(row), description: spec.description }
      : emptySubmission(spec);
  });

  return { studentId: student.id, items };
}

export async function uploadRequiredDocument(formData) {
  const auth = await getSessionProfile();
  if (auth.error) return { error: auth.error };
  const { admin, profile } = auth;
  if (profile.role !== "student") return { error: "Unauthorized" };

  const docKey = String(formData.get("docKey") || "").trim();
  const spec = requiredDocumentByKey(docKey);
  if (!spec) return { error: "Unknown document type." };

  const file = formData.get("file");
  if (!file || typeof file !== "object" || !file.size) {
    return { error: "Choose a PDF or image to upload." };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { error: "File must be 8 MB or smaller." };
  }
  const ext = String(file.name || "file").split(".").pop()?.toLowerCase() || "";
  const allowed = ["pdf", "jpg", "jpeg", "png", "webp"];
  if (!allowed.includes(ext)) {
    return { error: "Upload a PDF or image (JPG, PNG, WebP)." };
  }

  const { data: student } = await admin
    .from("students")
    .select("id, activation_status")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!student?.id) return { error: "Student record not found." };
  if (student.activation_status !== "active") {
    return { error: "Activate your student portal before uploading documents." };
  }

  const { data: existing, error: existingError } = await admin
    .from("student_documents")
    .select("id, status, file_path")
    .eq("student_id", student.id)
    .eq("doc_key", docKey)
    .maybeSingle();

  if (existingError && isStudentDocumentsTableMissing(existingError)) {
    return { error: DOCUMENT_SQL_HINT };
  }
  if (existingError) return { error: existingError.message };
  if (existing && !canStudentReplaceDocument(existing.status)) {
    return { error: "This document is locked while it is under review or approved." };
  }

  const filePath = `${student.id}/${docKey}-${Date.now()}.${ext}`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(filePath, file, {
    contentType: file.type || undefined,
    upsert: true,
  });
  if (uploadError) {
    if (/bucket not found|not found/i.test(uploadError.message)) {
      return { error: DOCUMENT_SQL_HINT };
    }
    return { error: uploadError.message };
  }

  const payload = {
    student_id: student.id,
    doc_key: docKey,
    file_name: file.name || `${spec.label}.${ext}`,
    file_path: filePath,
    file_size: file.size,
    content_type: file.type || null,
    status: "submitted",
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const query = existing
    ? admin.from("student_documents").update(payload).eq("id", existing.id)
    : admin.from("student_documents").insert(payload);

  const { error } = await query;
  if (error) {
    if (isStudentDocumentsTableMissing(error)) return { error: DOCUMENT_SQL_HINT };
    return { error: error.message };
  }

  if (existing?.file_path && existing.file_path !== filePath) {
    await admin.storage.from(BUCKET).remove([existing.file_path]);
  }

  revalidateDocumentPages();
  return { ok: true };
}

export async function reviewRequiredDocument({ id, status, notes }) {
  const auth = await getSessionProfile();
  if (auth.error) return { error: auth.error };
  const { admin, profile } = auth;
  if (!["teacher", "registrar"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  const nextStatus = String(status || "").trim();
  if (!REVIEW_STATUSES.includes(nextStatus)) {
    return { error: "Choose Under Review, Approved, or Needs Revision." };
  }
  const reviewerNotes = String(notes || "").trim();
  if (nextStatus === "needs_revision" && !reviewerNotes) {
    return { error: "Add a short note so the learner knows what to fix." };
  }

  const { data: row, error: loadError } = await admin
    .from("student_documents")
    .select("id, student_id")
    .eq("id", id)
    .maybeSingle();
  if (loadError) {
    if (isStudentDocumentsTableMissing(loadError)) return { error: DOCUMENT_SQL_HINT };
    return { error: loadError.message };
  }
  if (!row) return { error: "Document not found." };

  const allowed = await canManageStudent(admin, profile, row.student_id);
  if (!allowed) return { error: "You can only review learners in your sections." };

  const { error } = await admin
    .from("student_documents")
    .update({
      status: nextStatus,
      reviewer_notes: reviewerNotes || null,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateDocumentPages();
  return { ok: true };
}

export async function getRequiredDocumentUrl(id) {
  const auth = await getSessionProfile();
  if (auth.error) return { error: auth.error };
  const { admin, profile } = auth;

  const { data: row, error } = await admin
    .from("student_documents")
    .select("id, student_id, file_path")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (isStudentDocumentsTableMissing(error)) return { error: DOCUMENT_SQL_HINT };
    return { error: error.message };
  }
  if (!row?.file_path) return { error: "File not found." };

  if (profile.role === "student") {
    const { data: student } = await admin
      .from("students")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (student?.id !== row.student_id) return { error: "Unauthorized" };
  } else if (profile.role === "teacher") {
    const allowed = await canManageStudent(admin, profile, row.student_id);
    if (!allowed) return { error: "Unauthorized" };
  } else if (profile.role !== "registrar") {
    return { error: "Unauthorized" };
  }

  const { data, error: signedError } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(row.file_path, 60 * 10);
  if (signedError) return { error: signedError.message };
  return { url: data?.signedUrl || null };
}

export async function listManagedRequiredDocuments() {
  const auth = await getSessionProfile();
  if (auth.error) return { error: auth.error };
  const { admin, profile } = auth;
  if (!["teacher", "registrar"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  let students = [];
  let sectionMap = new Map();

  if (profile.role === "teacher") {
    const sectionIds = await teacherSectionIds(admin, profile.id);
    if (!sectionIds.length) return { learners: [], counts: emptyCounts() };

    const { data: sectionRows } = await admin
      .from("sections")
      .select("id, section_name, grade_level, school_year")
      .in("id", sectionIds);
    sectionMap = new Map((sectionRows || []).map((row) => [row.id, row]));

    const { data } = await admin
      .from("students")
      .select("id, lrn, section_id, profiles(first_name, last_name)")
      .in("section_id", sectionIds)
      .eq("activation_status", "active");
    students = data || [];
  } else {
    const { data } = await admin
      .from("students")
      .select("id, lrn, section_id, profiles(first_name, last_name)")
      .eq("activation_status", "active");
    students = data || [];
    const sectionIds = [
      ...new Set(students.map((row) => row.section_id).filter(Boolean)),
    ];
    if (sectionIds.length) {
      const { data: sectionRows } = await admin
        .from("sections")
        .select("id, section_name, grade_level, school_year")
        .in("id", sectionIds);
      sectionMap = new Map((sectionRows || []).map((row) => [row.id, row]));
    }
  }

  const studentIds = students.map((row) => row.id);
  let submissions = [];
  if (studentIds.length) {
    const { data, error } = await admin
      .from("student_documents")
      .select(
        "id, student_id, doc_key, file_name, file_path, file_size, status, reviewer_notes, submitted_at, reviewed_at"
      )
      .in("student_id", studentIds);
    if (error) {
      if (isStudentDocumentsTableMissing(error)) {
        const learners = buildLearners(students, sectionMap, []);
        return {
          hint: DOCUMENT_SQL_HINT,
          learners,
          counts: countBoard(learners),
        };
      }
      return { error: error.message };
    }
    submissions = data || [];
  }

  const learners = buildLearners(students, sectionMap, submissions);
  return { learners, counts: countBoard(learners) };
}

function buildLearners(students, sectionMap, submissions) {
  const byStudent = new Map();
  for (const row of submissions) {
    if (!byStudent.has(row.student_id)) byStudent.set(row.student_id, []);
    byStudent.get(row.student_id).push(row);
  }

  return students
    .map((student) => {
      const rows = byStudent.get(student.id) || [];
      const mapped = new Map(rows.map((row) => [row.doc_key, mapSubmission(row)]));
      const documents = REQUIRED_DOCUMENTS.map((spec) => {
        const current = mapped.get(spec.key);
        return current
          ? { ...current, description: spec.description }
          : emptySubmission(spec);
      });
      const section = sectionMap.get(student.section_id);
      return {
        studentId: student.id,
        name: learnerDisplayName(student.profiles),
        lrn: student.lrn || "—",
        sectionLabel: section ? sectionLabel(section) : "Unassigned",
        documents,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function emptyCounts() {
  return {
    not_submitted: 0,
    submitted: 0,
    under_review: 0,
    approved: 0,
    needs_revision: 0,
    learners: 0,
  };
}

function countBoard(learners) {
  const counts = emptyCounts();
  counts.learners = learners.length;
  for (const learner of learners) {
    for (const doc of learner.documents) {
      if (counts[doc.status] != null) counts[doc.status] += 1;
    }
  }
  return counts;
}
