import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: path.join(projectRoot, ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const ROWS = LETTERS.map((letter, index) => ({
  id: `c1200000-0000-4000-8000-00000000000${index + 1}`,
  section_name: `HUMSS-${letter}`,
  grade_level: 12,
  school_year: "2025-2026",
  track_strand: "HUMSS",
  capacity: 45,
  male_count: 0,
  female_count: 0,
}));

const names = ROWS.map((r) => r.section_name);
const ids = ROWS.map((r) => r.id);

const { data: existing } = await admin
  .from("sections")
  .select("id")
  .eq("grade_level", 12)
  .eq("school_year", "2025-2026")
  .in("section_name", names);

const deleteIds = Array.from(
  new Set([...(existing || []).map((r) => r.id), ...ids])
);

if (deleteIds.length) {
  await admin.from("students").update({ section_id: null }).in("section_id", deleteIds);
  const { error: delError } = await admin.from("sections").delete().in("id", deleteIds);
  if (delError) {
    console.warn("Delete existing:", delError.message);
  }
}

const { data, error } = await admin
  .from("sections")
  .insert(ROWS)
  .select("grade_level, section_name, school_year, track_strand");

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log("Inserted Grade 12 HUMSS sections:");
for (const row of data || []) {
  console.log(`  G${row.grade_level} ${row.section_name} (${row.school_year})`);
}
