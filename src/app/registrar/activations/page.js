import { AppShell } from "@/components/layout/AppShell";
import { PendingActivationsTable } from "@/components/registrar/PendingActivationsTable";
import { requireRole } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Student Activations" };

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
    "id, lrn, gender, grade_level, section_id, status, activation_status, contact_number, emergency_contact_name, emergency_contact_number, emergency_contact_address, profile_id, profiles(first_name, last_name, email, status)",
    "id, lrn, gender, grade_level, section_id, status, activation_status, contact_number, profile_id, profiles(first_name, last_name, email, status)",
    "id, lrn, gender, grade_level, section_id, status, activation_status, contact_number, profile_id, profiles(first_name, last_name)",
    "id, lrn, gender, grade_level, section_id, status, activation_status, contact_number, profile_id",
  ];

  let lastError = "";
  for (const fields of attempts) {
    let result = await db
      .from("students")
      .select(fields)
      .is("deleted_at", null)
      .order("grade_level")
      .limit(2000);
    if (result.error && /deleted_at/i.test(result.error.message || "")) {
      result = await db
        .from("students")
        .select(fields)
        .order("grade_level")
        .limit(2000);
    }
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

function withEmergencyContact(students) {
  return (students || []).map((stu) => ({
    ...stu,
    parent_name: stu.emergency_contact_name || "",
    parent_phone: stu.emergency_contact_number || "",
    parent_address: stu.emergency_contact_address || "",
    parent_email: "",
    parent_access_code_shown: "",
  }));
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
  const pendingRows = withEmergencyContact(awaiting);
  const activatedRows = withEmergencyContact(activated);

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Student activations"
      subtitle="Newly enrolled or registered learners stay here until they submit personal and emergency contact details and you Verify & Approve."
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
