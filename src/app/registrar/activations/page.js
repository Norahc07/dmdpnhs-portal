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

function isAwaitingActivation(student) {
  const status = String(student?.activation_status || "")
    .trim()
    .toLowerCase();
  return status === "pending" || status === "incomplete" || !status;
}

function isActivated(student) {
  return String(student?.activation_status || "").trim().toLowerCase() === "active";
}

async function fetchStudents(db) {
  const attempts = [
    "id, lrn, gender, grade_level, section_id, status, activation_status, contact_number, parent_access_code_shown, profile_id, profiles(first_name, last_name, email, status)",
    "id, lrn, gender, grade_level, section_id, status, activation_status, contact_number, profile_id, profiles(first_name, last_name, email, status)",
    "id, lrn, gender, grade_level, section_id, status, activation_status, contact_number, profile_id, profiles(first_name, last_name)",
    "id, lrn, gender, grade_level, section_id, status, activation_status, contact_number, profile_id",
  ];

  let lastError = "";
  for (const fields of attempts) {
    const result = await db
      .from("students")
      .select(fields)
      .order("grade_level")
      .limit(2000);
    if (!result.error) {
      return { rows: result.data || [], error: "" };
    }
    lastError = result.error.message || "Could not load students.";
  }
  return { rows: [], error: lastError };
}

async function hydrateProfiles(db, students) {
  const missingIds = [
    ...new Set(
      (students || [])
        .filter((row) => row.profile_id && !row.profiles)
        .map((row) => row.profile_id)
    ),
  ];
  if (!missingIds.length) return students || [];

  const { data: profiles } = await db
    .from("profiles")
    .select("id, first_name, last_name, email, status")
    .in("id", missingIds);

  const byId = new Map((profiles || []).map((p) => [p.id, p]));
  return (students || []).map((row) => ({
    ...row,
    profiles: row.profiles || byId.get(row.profile_id) || null,
  }));
}

function attachSections(students, sections) {
  const byId = new Map((sections || []).map((s) => [s.id, s]));
  return (students || []).map((row) => ({
    ...row,
    sections:
      row.sections ||
      (row.section_id ? byId.get(row.section_id) || null : null),
  }));
}

async function withParentInfo(db, students) {
  const list = students || [];
  if (!list.length) return [];

  const studentIds = list.map((s) => s.id).filter(Boolean);
  const accessCodes = [
    ...new Set(list.map((s) => s.parent_access_code_shown).filter(Boolean)),
  ];

  let links = [];
  let parentsByCode = [];
  try {
    const [linksRes, parentsRes] = await Promise.all([
      studentIds.length
        ? db
            .from("parent_student_links")
            .select(
              "student_id, parents(id, phone_number, email, access_code, profile_id, profiles(first_name, last_name))"
            )
            .in("student_id", studentIds)
        : Promise.resolve({ data: [] }),
      accessCodes.length
        ? db
            .from("parents")
            .select(
              "id, phone_number, email, access_code, profile_id, profiles(first_name, last_name)"
            )
            .in("access_code", accessCodes)
        : Promise.resolve({ data: [] }),
    ]);
    links = linksRes.data || [];
    parentsByCode = parentsRes.data || [];
  } catch {
    links = [];
    parentsByCode = [];
  }

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
  const { supabase, profile } = await requireRole("registrar");

  let admin = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const [{ rows: registrarRows, error: registrarError }, sectionsRes] =
    await Promise.all([
      fetchStudents(supabase),
      supabase
        .from("sections")
        .select("id, section_name, grade_level, school_year")
        .order("grade_level")
        .order("section_name"),
    ]);

  let students = registrarRows;
  let loadError = registrarError;
  if (!students.length && admin) {
    const adminLoad = await fetchStudents(admin);
    if (adminLoad.rows.length) {
      students = adminLoad.rows;
      loadError = "";
    } else if (adminLoad.error) {
      loadError = registrarError || adminLoad.error;
    }
  }

  const sections = sectionsRes.data || [];
  students = attachSections(await hydrateProfiles(supabase, students), sections);

  const awaiting = students.filter(isAwaitingActivation);
  const activated = students.filter(isActivated);

  const dbForParents = admin || supabase;
  const [pendingRows, activatedRows] = await Promise.all([
    withParentInfo(dbForParents, awaiting),
    withParentInfo(dbForParents, activated),
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
        sections={sections}
        loadError={
          loadError && !students.length
            ? `Could not load activations: ${loadError}`
            : ""
        }
      />
    </AppShell>
  );
}
