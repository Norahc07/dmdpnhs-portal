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

console.log("Seeding demo grades (incl. Juan · G8 Mitochondria)…");
const result = await seedDemoGradesAttendanceParents();
console.log("seed =>", result);

const admin = createAdminClient();
const { data: juan } = await admin
  .from("students")
  .select(
    "id, lrn, grade_level, personal_email, sections(section_name, grade_level, school_year)"
  )
  .eq("lrn", "111111111111")
  .maybeSingle();

const { data: records } = juan?.id
  ? await admin
      .from("class_records")
      .select(
        "term, workflow_status, data, teacher_assignments!inner(section_id, subjects(subject_name))"
      )
      .eq("teacher_assignments.section_id", juan.sections ? undefined : "x")
  : { data: [] };

// Fetch by Juan's section id
let juanRecords = [];
if (juan?.id) {
  const sectionId = (
    await admin
      .from("students")
      .select("section_id")
      .eq("id", juan.id)
      .maybeSingle()
  ).data?.section_id;

  if (sectionId) {
    const { data: asgs } = await admin
      .from("teacher_assignments")
      .select("id, subjects(subject_name)")
      .eq("section_id", sectionId);
    const asgIds = (asgs || []).map((a) => a.id);
    if (asgIds.length) {
      const { data: crs } = await admin
        .from("class_records")
        .select("term, workflow_status, data, assignment_id")
        .in("assignment_id", asgIds);
      juanRecords = (crs || []).map((r) => ({
        term: r.term,
        status: r.workflow_status,
        hasJuan: Boolean(r.data?.students?.[juan.id]),
        subject:
          asgs.find((a) => a.id === r.assignment_id)?.subjects?.subject_name,
      }));
    }
  }
}

const { data: gradeRows } = juan?.id
  ? await admin
      .from("grades")
      .select("quarter, final_transmuted_grade, subjects(subject_name)")
      .eq("student_id", juan.id)
  : { data: [] };

console.log({
  juan: juan
    ? {
        lrn: juan.lrn,
        grade: juan.grade_level,
        email: juan.personal_email,
        section: juan.sections,
      }
    : null,
  classRecords: juanRecords,
  publishedGrades: gradeRows,
});
