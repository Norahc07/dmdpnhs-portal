import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, "..", "src");
const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: { "@": src },
});

const { createAdminClient } = jiti(path.join(src, "lib", "supabase", "admin.js"));
const { ensurePromotionDemoData } = jiti(
  path.join(src, "lib", "ensure-promotion-demo.js")
);

const result = await ensurePromotionDemoData();
console.log("ensurePromotionDemoData =>", result);

const admin = createAdminClient();
const { error: probe } = await admin
  .from("enrollments")
  .select("id", { count: "exact", head: true });

if (probe) {
  console.log(
    "\nEnrollments table missing. Apply supabase/enrollments-promotion.sql in the Supabase SQL editor."
  );
  console.log("Probe error:", probe.message);
} else {
  console.log("Enrollments table: ready");
}

const { data: nextSecs } = await admin
  .from("sections")
  .select("section_name, grade_level, school_year, capacity")
  .eq("school_year", "2026-2027")
  .order("grade_level");

console.log("Next-year sections:", nextSecs);

const { data: roseStatuses } = await admin
  .from("students")
  .select("lrn, status, sections!inner(section_name)")
  .eq("sections.section_name", "Rose")
  .like("lrn", "9100000001%");

console.log("Rose EOSY:", roseStatuses);
