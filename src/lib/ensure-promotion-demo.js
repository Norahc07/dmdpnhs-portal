import { createAdminClient } from "@/lib/supabase/admin";
import {
  SCHOOL_YEAR_DEFAULT,
  SECTION_CAPACITY_DEFAULT,
  nextSchoolYear,
} from "@/lib/constants";

const PROMOTION_DEMO_MARKER = "promotion-demo-v1";

/** Next-year destination sections for batch promotion demos. */
const NEXT_YEAR_SECTIONS = [
  {
    section_name: "Golgi",
    grade_level: 8,
    capacity: SECTION_CAPACITY_DEFAULT,
  },
  {
    section_name: "Mitochondria",
    grade_level: 9,
    capacity: SECTION_CAPACITY_DEFAULT,
  },
  {
    section_name: "STEM ENGINEERING A",
    grade_level: 12,
    capacity: SECTION_CAPACITY_DEFAULT,
    track_strand: "STEM ENGINEERING",
  },
];

/** LRN → EOSY status for Grade 7 Rose demo roster */
const ROSE_EOSY = {
  "910000000101": "promoted",
  "910000000102": "promoted",
  "910000000103": "promoted",
  "910000000104": "promoted",
  "910000000105": "remedial",
  "910000000106": "retained",
};

let promotionDemoInFlight = null;

async function ensureNextYearSections(admin, nextYear) {
  for (const spec of NEXT_YEAR_SECTIONS) {
    const { data: existing } = await admin
      .from("sections")
      .select("id")
      .eq("school_year", nextYear)
      .eq("grade_level", spec.grade_level)
      .eq("section_name", spec.section_name)
      .limit(1);

    if (existing?.[0]?.id) {
      await admin
        .from("sections")
        .update({
          capacity: spec.capacity,
          ...(spec.track_strand ? { track_strand: spec.track_strand } : {}),
        })
        .eq("id", existing[0].id);
      continue;
    }

    const payload = {
      section_name: spec.section_name,
      grade_level: spec.grade_level,
      school_year: nextYear,
      capacity: spec.capacity,
      male_count: 0,
      female_count: 0,
      ...(spec.track_strand ? { track_strand: spec.track_strand } : {}),
    };

    const { error } = await admin.from("sections").insert(payload);
    if (error) {
      console.error("[ensurePromotionDemoData] section", spec.section_name, error.message);
    }
  }
}

async function ensureRoseEosyStatuses(admin) {
  const { data: rose } = await admin
    .from("sections")
    .select("id")
    .eq("school_year", SCHOOL_YEAR_DEFAULT)
    .eq("grade_level", 7)
    .eq("section_name", "Rose")
    .limit(1);

  const roseId = rose?.[0]?.id;
  if (!roseId) return;

  await admin
    .from("sections")
    .update({ capacity: SECTION_CAPACITY_DEFAULT })
    .eq("id", roseId);

  for (const [lrn, status] of Object.entries(ROSE_EOSY)) {
    await admin
      .from("students")
      .update({ status, section_id: roseId, grade_level: 7 })
      .eq("lrn", lrn);
  }
}

async function ensureOrchidEosyStatuses(admin) {
  const { data: orchid } = await admin
    .from("sections")
    .select("id")
    .eq("school_year", SCHOOL_YEAR_DEFAULT)
    .eq("grade_level", 8)
    .eq("section_name", "Orchid")
    .limit(1);

  const orchidId = orchid?.[0]?.id;
  if (!orchidId) return;

  await admin
    .from("sections")
    .update({ capacity: SECTION_CAPACITY_DEFAULT })
    .eq("id", orchidId);

  const { data: learners } = await admin
    .from("students")
    .select("id, lrn")
    .eq("section_id", orchidId)
    .like("lrn", "9100000002%");

  const statuses = ["promoted", "promoted", "promoted", "promoted", "remedial", "enrolled"];
  for (let i = 0; i < (learners || []).length; i += 1) {
    await admin
      .from("students")
      .update({ status: statuses[i % statuses.length] })
      .eq("id", learners[i].id);
  }
}

/**
 * Idempotent demo prep for /registrar/promotion:
 * next-year target sections + mixed EOSY statuses on Rose/Orchid.
 */
export async function ensurePromotionDemoData() {
  if (process.env.REGISTRAR_OPS_DEMO !== "1") {
    return { skipped: true };
  }
  if (promotionDemoInFlight) return promotionDemoInFlight;

  promotionDemoInFlight = (async () => {
    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return { skipped: true, reason: "admin_unavailable" };
    }

    try {
      const nextYear = nextSchoolYear(SCHOOL_YEAR_DEFAULT);
      await ensureNextYearSections(admin, nextYear);
      await ensureRoseEosyStatuses(admin);
      await ensureOrchidEosyStatuses(admin);

      // Soft-probe enrollments table (do not fail page if missing)
      const { error: probe } = await admin
        .from("enrollments")
        .select("id", { count: "exact", head: true });
      const enrollmentsReady = !probe;

      return {
        ok: true,
        nextYear,
        enrollmentsReady,
        marker: PROMOTION_DEMO_MARKER,
      };
    } catch (err) {
      console.error("[ensurePromotionDemoData]", err);
      return { ok: false, error: String(err?.message || err) };
    }
  })();

  try {
    return await promotionDemoInFlight;
  } finally {
    promotionDemoInFlight = null;
  }
}
