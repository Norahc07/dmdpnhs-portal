import { createAdminClient } from "@/lib/supabase/admin";

const ROSTER_FIELDS =
  "id, lrn, gender, grade_level, status, activation_status, section_id, profile_id";

function applyRosterFilters(query, sectionId, { activeOnly, withDeletedAt }) {
  let next = query.eq("section_id", sectionId).order("gender").order("lrn");
  if (withDeletedAt) next = next.is("deleted_at", null);
  if (activeOnly) {
    next = next.eq("activation_status", "active");
  } else {
    // Enrolled / placed learners visible to teachers (pending or active).
    next = next.in("activation_status", ["active", "pending"]);
  }
  return next;
}

async function attachRosterProfiles(admin, rows) {
  const profileIds = [
    ...new Set(rows.map((row) => row.profile_id).filter(Boolean)),
  ];
  if (!profileIds.length) return rows;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", profileIds);
  const byId = new Map((profiles || []).map((p) => [p.id, p]));
  for (const row of rows) {
    row.profiles = row.profile_id ? byId.get(row.profile_id) || null : null;
  }
  return rows;
}

/**
 * Load learners for a section the teacher is authorized to handle.
 * Uses admin after authorization so RLS on students/profiles cannot hide the roster.
 * Includes activated + pending enrolled learners (not trash).
 * Names are loaded via a separate profiles query (avoids broken nested embeds).
 */
export async function loadTeacherSectionRoster(sectionId, { activeOnly = false } = {}) {
  if (!sectionId) return { students: [], error: null };

  const admin = createAdminClient();
  const opts = { activeOnly };

  let result = await applyRosterFilters(
    admin.from("students").select(ROSTER_FIELDS),
    sectionId,
    { ...opts, withDeletedAt: true }
  );

  if (result.error && /deleted_at/i.test(result.error.message || "")) {
    result = await applyRosterFilters(
      admin.from("students").select(ROSTER_FIELDS),
      sectionId,
      { ...opts, withDeletedAt: false }
    );
  }

  if (result.error && /activation_status/i.test(result.error.message || "")) {
    result = await admin
      .from("students")
      .select("id, lrn, gender, grade_level, status, section_id, profile_id")
      .eq("section_id", sectionId)
      .is("deleted_at", null)
      .order("gender")
      .order("lrn");
  }

  if (result.error) {
    return { students: [], error: result.error.message };
  }

  // Prefer officially enrolled statuses when present; still keep activation filter above.
  let rows = (result.data || []).filter((row) => {
    const st = String(row.status || "").toLowerCase();
    if (!st) return true;
    return ["enrolled", "promoted", "retained", "remedial"].includes(st);
  });

  rows = await attachRosterProfiles(admin, rows);

  return { students: rows, error: null };
}
