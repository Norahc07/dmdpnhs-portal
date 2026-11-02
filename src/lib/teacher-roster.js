import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Load learners for a section the teacher is authorized to handle.
 * Uses admin after authorization so RLS on students/profiles cannot hide the roster.
 * Includes activated + pending enrolled learners (not trash).
 */
export async function loadTeacherSectionRoster(sectionId, { activeOnly = false } = {}) {
  if (!sectionId) return { students: [], error: null };

  const admin = createAdminClient();
  const fields =
    "id, lrn, gender, grade_level, status, activation_status, section_id, profiles(first_name, last_name)";

  let query = admin
    .from("students")
    .select(fields)
    .eq("section_id", sectionId)
    .is("deleted_at", null)
    .order("gender")
    .order("lrn");

  if (activeOnly) {
    query = query.eq("activation_status", "active");
  } else {
    // Enrolled / placed learners visible to teachers (pending or active).
    query = query.in("activation_status", ["active", "pending"]);
  }

  let result = await query;
  if (result.error && /deleted_at/i.test(result.error.message || "")) {
    let retry = admin
      .from("students")
      .select(fields)
      .eq("section_id", sectionId)
      .order("gender")
      .order("lrn");
    if (activeOnly) {
      retry = retry.eq("activation_status", "active");
    } else {
      retry = retry.in("activation_status", ["active", "pending"]);
    }
    result = await retry;
  }

  if (result.error && /activation_status|profiles/i.test(result.error.message || "")) {
    result = await admin
      .from("students")
      .select(
        "id, lrn, gender, grade_level, status, activation_status, section_id"
      )
      .eq("section_id", sectionId)
      .is("deleted_at", null)
      .order("lrn");
  }

  if (result.error) {
    return { students: [], error: result.error.message };
  }

  // Prefer officially enrolled statuses when present; still keep activation filter above.
  const rows = (result.data || []).filter((row) => {
    const st = String(row.status || "").toLowerCase();
    if (!st) return true;
    return ["enrolled", "promoted", "retained", "remedial"].includes(st);
  });

  return { students: rows, error: null };
}
