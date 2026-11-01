import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { CACHE_TAGS } from "@/lib/cache/tags";

const STUDENT_FIELDS =
  "id, lrn, birthdate, gender, grade_level, section_id, current_term, status, activation_status, emergency_contact_name, emergency_contact_number, profile_id, profiles(first_name, last_name, email, status)";

async function loadStudentsUncached() {
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return { rows: [], error: err?.message || "Admin client unavailable." };
  }

  let result = await admin
    .from("students")
    .select(STUDENT_FIELDS)
    .is("deleted_at", null)
    .order("grade_level")
    .order("lrn")
    .limit(5000);

  if (result.error && /deleted_at/i.test(result.error.message || "")) {
    result = await admin
      .from("students")
      .select(STUDENT_FIELDS)
      .order("grade_level")
      .order("lrn")
      .limit(5000);
  }

  if (result.error && /current_term/i.test(result.error.message || "")) {
    result = await admin
      .from("students")
      .select(
        "id, lrn, birthdate, gender, grade_level, section_id, status, activation_status, emergency_contact_name, emergency_contact_number, profile_id, profiles(first_name, last_name, email, status)"
      )
      .is("deleted_at", null)
      .order("grade_level")
      .order("lrn")
      .limit(5000);
  }

  if (result.error && /emergency_contact|profiles/i.test(result.error.message || "")) {
    result = await admin
      .from("students")
      .select(
        "id, lrn, birthdate, gender, grade_level, section_id, status, activation_status, emergency_contact_name, emergency_contact_number, profile_id"
      )
      .is("deleted_at", null)
      .order("grade_level")
      .order("lrn")
      .limit(5000);
  }

  if (result.error) {
    return { rows: [], error: result.error.message };
  }

  const rows = (result.data || []).filter(
    (row) => String(row.status || "").toLowerCase() !== "deleted"
  );

  const missingIds = [
    ...new Set(
      rows
        .filter((row) => row.profile_id && !row.profiles)
        .map((row) => row.profile_id)
    ),
  ];
  if (missingIds.length) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, first_name, last_name, email, status")
      .in("id", missingIds);
    const byId = new Map((profiles || []).map((p) => [p.id, p]));
    for (const row of rows) {
      if (!row.profiles && row.profile_id) {
        row.profiles = byId.get(row.profile_id) || null;
      }
    }
  }

  return { rows, error: "" };
}

async function loadSectionsUncached() {
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return { rows: [], error: err?.message || "Admin client unavailable." };
  }

  const { data, error } = await admin
    .from("sections")
    .select(
      "id, section_name, grade_level, school_year, track_strand, capacity, male_count, female_count"
    )
    .order("grade_level")
    .order("section_name");

  if (error) return { rows: [], error: error.message };
  return { rows: data || [], error: "" };
}

/** Cached registrar student roster (active / non-trash). */
export const getCachedRegistrarStudents = unstable_cache(
  loadStudentsUncached,
  ["registrar-students-v2"],
  { revalidate: 30, tags: [CACHE_TAGS.registrarStudents] }
);

/** Cached sections list for registrar enrollment/activations. */
export const getCachedRegistrarSections = unstable_cache(
  loadSectionsUncached,
  ["registrar-sections-v2"],
  { revalidate: 60, tags: [CACHE_TAGS.registrarSections] }
);
