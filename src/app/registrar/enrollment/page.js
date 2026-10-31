import { AppShell } from "@/components/layout/AppShell";
import { EnrollmentTable } from "@/components/registrar/EnrollmentTable";
import { requireRole } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Enrollment" };

async function fetchEnrollmentStudents(db) {
  const attempts = [
    "id, lrn, gender, grade_level, section_id, status, activation_status, profile_id, profiles(first_name, last_name)",
    "id, lrn, gender, grade_level, section_id, status, activation_status, profile_id, profiles(first_name, last_name, email)",
    "id, lrn, gender, grade_level, section_id, status, activation_status, profile_id",
  ];

  let lastError = "";
  for (const fields of attempts) {
    let result = await db
      .from("students")
      .select(fields)
      .is("deleted_at", null)
      .order("grade_level")
      .order("lrn")
      .limit(5000);
    if (result.error && /deleted_at/i.test(result.error.message || "")) {
      result = await db
        .from("students")
        .select(fields)
        .order("grade_level")
        .order("lrn")
        .limit(5000);
    }
    if (!result.error) {
      const rows = (result.data || []).filter((row) => {
        const status = String(row.status || "").toLowerCase();
        return status !== "deleted";
      });
      return { rows, error: "" };
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
    .select("id, first_name, last_name, email")
    .in("id", missingIds);

  const byId = new Map((profiles || []).map((p) => [p.id, p]));
  return (students || []).map((row) => ({
    ...row,
    profiles: row.profiles || byId.get(row.profile_id) || null,
  }));
}

export default async function RegistrarEnrollmentPage() {
  const { supabase, profile } = await requireRole("registrar");

  let admin = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  // Always prefer admin so the list matches LRN uniqueness checks on enroll.
  // Session RLS can omit students that still exist in the database.
  const reader = admin || supabase;
  const [{ rows, error: loadError }, sectionsRes] = await Promise.all([
    fetchEnrollmentStudents(reader),
    supabase
      .from("sections")
      .select(
        "id, section_name, grade_level, school_year, track_strand, capacity, male_count, female_count"
      )
      .order("grade_level"),
  ]);

  let students = rows;
  let error = loadError;
  if ((!students.length || error) && admin && reader !== admin) {
    const adminLoad = await fetchEnrollmentStudents(admin);
    if (adminLoad.rows.length) {
      students = adminLoad.rows;
      error = "";
    } else if (adminLoad.error) {
      error = error || adminLoad.error;
    }
  }

  students = await hydrateProfiles(admin || supabase, students);

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="School year enrollment"
      subtitle="All enrolled learners for the school year. Add a new learner here; they stay in Activations until details are submitted and you verify the account."
    >
      <EnrollmentTable
        students={students}
        sections={sectionsRes.data || []}
        loadError={
          error && !students.length
            ? `Could not load enrollment: ${error}`
            : ""
        }
      />
    </AppShell>
  );
}
