import { createJiti } from "jiti";
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(root, "..");
const src = path.join(projectRoot, "src");

loadEnv({ path: path.join(projectRoot, ".env.local") });
loadEnv({ path: path.join(projectRoot, ".env") });

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: { "@": src },
});

const { seedDemoGradesAttendanceParents } = jiti(
  path.join(src, "lib", "ensure-registrar-ops-demo.js")
);
const { createAdminClient } = jiti(path.join(src, "lib", "supabase", "admin.js"));

console.log("Seeding Orchid (locked) + 6 live sections + parents + attendance…");
const result = await seedDemoGradesAttendanceParents();
console.log("seedDemoGradesAttendanceParents =>", result);

const admin = createAdminClient();
const schoolYear = "2025-2026";

const sectionNames = [
  "Rose",
  "Orchid",
  "Lily",
  "Daisy",
  "Jasmine",
  "Tulip",
  "Sunflower",
  "Hibiscus",
];

const { data: sections } = await admin
  .from("sections")
  .select("id, section_name, grade_level, male_count, female_count")
  .eq("school_year", schoolYear)
  .in("section_name", sectionNames);

const sectionIds = (sections || []).map((s) => s.id);
const { data: records } = sectionIds.length
  ? await admin
      .from("class_records")
      .select("id, workflow_status, assignment_id, data, teacher_assignments!inner(section_id)")
      .in("teacher_assignments.section_id", sectionIds)
  : { data: [] };

const byStatus = {};
for (const r of records || []) {
  byStatus[r.workflow_status] = (byStatus[r.workflow_status] || 0) + 1;
}

const { data: parent } = await admin
  .from("parents")
  .select("id, access_code, email, parent_student_links(student_id)")
  .eq("access_code", "P26-GRADS")
  .maybeSingle();

const { count: attendanceCount } = await admin
  .from("attendance")
  .select("*", { count: "exact", head: true })
  .in(
    "section_id",
    sectionIds.length ? sectionIds : ["00000000-0000-0000-0000-000000000000"]
  );

console.log({
  sections: (sections || []).map((s) => ({
    name: s.section_name,
    grade: s.grade_level,
    male: s.male_count,
    female: s.female_count,
  })),
  classRecords: records?.length || 0,
  byStatus,
  demoParent: parent
    ? {
        access_code: parent.access_code,
        email: parent.email,
        linkedChildren: parent.parent_student_links?.length || 0,
      }
    : null,
  attendanceRows: attendanceCount,
});
