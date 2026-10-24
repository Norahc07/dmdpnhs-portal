import { AppShell } from "@/components/layout/AppShell";
import { PendingActivationsTable } from "@/components/registrar/PendingActivationsTable";
import { requireRole } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Student Activations" };

function normalizeParentEmbed(raw) {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] || null : raw;
}

function parentDisplayName(parent) {
  if (!parent) return "";
  const profile = normalizeParentEmbed(parent.profiles);
  return `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
}

async function withParentInfo(admin, students) {
  const list = students || [];
  if (!list.length) return [];

  const studentIds = list.map((s) => s.id).filter(Boolean);
  const accessCodes = [
    ...new Set(
      list.map((s) => s.parent_access_code_shown).filter(Boolean)
    ),
  ];

  const [{ data: links }, { data: parentsByCode }] = await Promise.all([
    studentIds.length
      ? admin
          .from("parent_student_links")
          .select(
            "student_id, parents(id, phone_number, email, access_code, profile_id, profiles(first_name, last_name))"
          )
          .in("student_id", studentIds)
      : Promise.resolve({ data: [] }),
    accessCodes.length
      ? admin
          .from("parents")
          .select(
            "id, phone_number, email, access_code, profile_id, profiles(first_name, last_name)"
          )
          .in("access_code", accessCodes)
      : Promise.resolve({ data: [] }),
  ]);

  const parentByStudentId = new Map();
  for (const link of links || []) {
    const parent = normalizeParentEmbed(link.parents);
    if (link.student_id && parent) {
      parentByStudentId.set(link.student_id, parent);
    }
  }

  const parentByAccessCode = new Map();
  for (const parent of parentsByCode || []) {
    if (parent?.access_code) {
      parentByAccessCode.set(parent.access_code, parent);
    }
  }

  return list.map((stu) => {
    const parent =
      parentByStudentId.get(stu.id) ||
      parentByAccessCode.get(stu.parent_access_code_shown) ||
      null;

    return {
      ...stu,
      parent_name: parentDisplayName(parent),
      parent_phone: parent?.phone_number || "",
      parent_email: parent?.email || "",
      parent_access_code_shown:
        stu.parent_access_code_shown || parent?.access_code || "",
      parent_id: parent?.id || null,
    };
  });
}

export default async function RegistrarActivationsPage() {
  const { profile } = await requireRole("registrar");
  const admin = createAdminClient();

  const selectFields =
    "id, lrn, gender, grade_level, section_id, status, activation_status, contact_number, parent_access_code_shown, profiles(first_name, last_name, email, status), sections(section_name, grade_level, school_year)";
  const selectFallback =
    "id, lrn, gender, grade_level, section_id, status, activation_status, contact_number, profiles(first_name, last_name, email, status), sections(section_name, grade_level, school_year)";

  async function loadByStatus(statuses, limit) {
    const query = (fields) =>
      admin
        .from("students")
        .select(fields)
        .in("activation_status", statuses)
        .order("lrn")
        .limit(limit);

    let result = await query(selectFields);
    if (result.error) {
      result = await query(selectFallback);
    }
    if (result.error) {
      console.error("[activations]", statuses, result.error.message);
      return [];
    }
    const rows = result.data || [];
    return [...rows].sort((a, b) => {
      const rank = (status) => (status === "pending" ? 0 : 1);
      return (
        rank(a.activation_status) - rank(b.activation_status) ||
        String(a.lrn || "").localeCompare(String(b.lrn || ""))
      );
    });
  }

  const [pending, activated, sectionsRes] = await Promise.all([
    loadByStatus(["pending", "incomplete"], 400),
    loadByStatus(["active"], 150),
    admin
      .from("sections")
      .select("id, section_name, grade_level, school_year")
      .order("grade_level")
      .order("section_name"),
  ]);
  const sections = sectionsRes.data;

  const [pendingRows, activatedRows] = await Promise.all([
    withParentInfo(admin, pending),
    withParentInfo(admin, activated),
  ]);

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Student activations"
      subtitle="Newly enrolled or registered learners stay here until they submit personal/guardian details and you Verify & Approve. Call the parent/guardian number before approving."
    >
      <PendingActivationsTable
        pendingRows={pendingRows}
        activatedRows={activatedRows}
        sections={sections || []}
      />
    </AppShell>
  );
}
