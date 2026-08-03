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
            "student_id, parents(id, phone_number, access_code, profile_id, profiles(first_name, last_name))"
          )
          .in("student_id", studentIds)
      : Promise.resolve({ data: [] }),
    accessCodes.length
      ? admin
          .from("parents")
          .select(
            "id, phone_number, access_code, profile_id, profiles(first_name, last_name)"
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

  const [{ data: pending }, { data: activated }, { data: sections }] =
    await Promise.all([
      admin
        .from("students")
        .select(selectFields)
        .eq("activation_status", "pending")
        .order("lrn")
        .limit(200),
      admin
        .from("students")
        .select(selectFields)
        .eq("activation_status", "active")
        .order("lrn")
        .limit(150),
      admin
        .from("sections")
        .select("id, section_name, grade_level, school_year")
        .order("grade_level")
        .order("section_name"),
    ]);

  const [pendingRows, activatedRows] = await Promise.all([
    withParentInfo(admin, pending),
    withParentInfo(admin, activated),
  ]);

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Student activations"
      subtitle="Call the parent/guardian number to confirm it is real, verify personal details, then Verify & Approve. DMDPNHS SMSs the Parent Access Code and notifies the student."
    >
      <PendingActivationsTable
        pendingRows={pendingRows}
        activatedRows={activatedRows}
        sections={sections || []}
      />
    </AppShell>
  );
}
