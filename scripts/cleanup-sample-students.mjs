import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: path.join(projectRoot, ".env.local") });
loadEnv({ path: path.join(projectRoot, ".env") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const WALKTHROUGH_LRNS = [
  "111111111111",
  "222222222222",
  "333333333333",
  "444444444444",
  "555555555555",
  "666666666666",
  "777777777777",
  "888888888888",
];

function isSampleLrn(lrn) {
  const value = String(lrn || "");
  return (
    WALKTHROUGH_LRNS.includes(value) ||
    value.startsWith("90000000000") ||
    value.startsWith("910000000")
  );
}

async function deleteByStudentIds(table, ids) {
  if (!ids.length) return { table, deleted: 0, skipped: false };
  const { error, count } = await admin
    .from(table)
    .delete({ count: "exact" })
    .in("student_id", ids);
  if (error) {
    if (/schema cache|does not exist|Could not find/i.test(error.message)) {
      return { table, deleted: 0, skipped: true };
    }
    throw new Error(`${table}: ${error.message}`);
  }
  return { table, deleted: count || 0, skipped: false };
}

const { data: students, error: listError } = await admin
  .from("students")
  .select("id, lrn, profile_id, grade_level, section_id");

if (listError) {
  console.error(listError.message);
  process.exit(1);
}

const sample = (students || []).filter((row) => isSampleLrn(row.lrn));
const ids = sample.map((row) => row.id);
const profileIds = sample.map((row) => row.profile_id).filter(Boolean);

console.log(`Found ${sample.length} sample student(s) to remove.`);
for (const row of sample) {
  console.log(
    `  - LRN ${row.lrn}  G${row.grade_level || "?"}  section ${row.section_id || "none"}`
  );
}

if (!ids.length) {
  console.log("Nothing to delete.");
  process.exit(0);
}

const { error: secretaryError } = await admin
  .from("sections")
  .update({ secretary_student_id: null })
  .in("secretary_student_id", ids);
if (
  secretaryError &&
  !/secretary_student_id|schema cache/i.test(secretaryError.message)
) {
  throw new Error(`sections.secretary: ${secretaryError.message}`);
}

const childTables = [
  "excuse_letters",
  "attendance",
  "grades",
  "document_requests",
  "enrollments",
  "evaluations",
  "parent_student_links",
];

for (const table of childTables) {
  const result = await deleteByStudentIds(table, ids);
  if (result.skipped) console.log(`Skip missing table ${table}`);
  else console.log(`Deleted ${result.deleted} from ${table}`);
}

const { error: studentError, count: studentCount } = await admin
  .from("students")
  .delete({ count: "exact" })
  .in("id", ids);
if (studentError) throw new Error(`students: ${studentError.message}`);
console.log(`Deleted ${studentCount || ids.length} student row(s).`);

if (profileIds.length) {
  const { error: profileError } = await admin
    .from("profiles")
    .delete()
    .in("id", profileIds)
    .eq("role", "student");
  if (profileError) console.warn(`profiles: ${profileError.message}`);
  else console.log(`Deleted ${profileIds.length} student profile(s).`);

  for (const profileId of profileIds) {
    const { error: authError } = await admin.auth.admin.deleteUser(profileId);
    if (authError && !/not found|User not found/i.test(authError.message)) {
      console.warn(`auth ${profileId}: ${authError.message}`);
    }
  }
  console.log("Removed matching Auth users.");
}

console.log("Sample student cleanup complete.");
