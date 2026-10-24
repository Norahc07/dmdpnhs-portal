import { createAdminClient } from "@/lib/supabase/admin";

export const ANNOUNCEMENT_TYPES = [
  { value: "announcement", label: "Announcement" },
  { value: "reminder", label: "Reminder" },
  { value: "assignment", label: "Assignment" },
  { value: "update", label: "Important update" },
];

export const ANNOUNCEMENT_TYPE_META = {
  announcement: {
    label: "Announcement",
    chip: "bg-sky-100 text-sky-800 border-sky-200",
  },
  reminder: {
    label: "Reminder",
    chip: "bg-amber-100 text-amber-900 border-amber-200",
  },
  assignment: {
    label: "Assignment",
    chip: "bg-violet-100 text-violet-800 border-violet-200",
  },
  update: {
    label: "Important update",
    chip: "bg-rose-100 text-rose-800 border-rose-200",
  },
};

export function announcementTypeLabel(type) {
  return ANNOUNCEMENT_TYPE_META[type]?.label || "Announcement";
}

export function isAnnouncementTableMissing(error) {
  const message = String(error?.message || error || "");
  return (
    /announcement/i.test(message) &&
    /does not exist|schema cache|could not find/i.test(message)
  );
}

export const ANNOUNCEMENT_SQL_HINT =
  "Announcements are not enabled yet. Apply supabase/announcements.sql in the Supabase SQL editor.";

export async function countUnreadAnnouncementsForStudent(studentId) {
  if (!studentId) return 0;
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("announcement_notifications")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .is("read_at", null);
    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

export function formatPostedAt(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-PH", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

export function sectionLabel(section) {
  if (!section) return "Section";
  return `Grade ${section.grade_level} · ${section.section_name}`;
}

export async function loadTeacherHandledSections(admin, teacherId) {
  if (!teacherId) return [];
  const sectionMap = new Map();

  const { data: assignments } = await admin
    .from("teacher_assignments")
    .select(
      "section_id, sections(id, section_name, grade_level, school_year, track_strand)"
    )
    .eq("teacher_id", teacherId);

  for (const row of assignments || []) {
    const section = row.sections;
    if (section?.id) sectionMap.set(section.id, section);
  }

  const { data: advisory } = await admin
    .from("sections")
    .select("id, section_name, grade_level, school_year, track_strand")
    .eq("adviser_id", teacherId);

  for (const section of advisory || []) {
    if (section?.id) sectionMap.set(section.id, section);
  }

  return Array.from(sectionMap.values()).sort((a, b) => {
    const grade = (a.grade_level || 0) - (b.grade_level || 0);
    if (grade !== 0) return grade;
    return String(a.section_name).localeCompare(String(b.section_name));
  });
}

export function mapAnnouncementRow(row) {
  const targets = row.announcement_targets || [];
  const attachments = row.announcement_attachments || [];
  const author = row.profiles || row.author || null;
  const postedBy = author
    ? [author.first_name, author.last_name].filter(Boolean).join(" ")
    : "Teacher";
  return {
    id: row.id,
    teacherId: row.teacher_id,
    authorProfileId: row.author_profile_id,
    postType: row.post_type,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    postedBy,
    sections: targets
      .map((target) => target.sections)
      .filter(Boolean)
      .sort((a, b) =>
        String(a.section_name).localeCompare(String(b.section_name))
      ),
    attachments,
    unread: Boolean(row.unread),
  };
}
