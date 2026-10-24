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

const SUBJECTS = [
  { term: 1, name: "Media and Information Literacy" },
  { term: 1, name: "Earth and Life Science" },
  { term: 1, name: "Physical Education and Health III" },
  { term: 1, name: "Practical Research II" },
  { term: 1, name: "Creative Non-Fiction" },
  {
    term: 1,
    name: "Trends, Networks, and Critical Thinking in the 21st Century Culture",
  },
  {
    term: 2,
    name: "Pagbasa at Pagsusuri ng Iba't-Ibang Teksto Tungo sa Pananaliksik",
  },
  { term: 2, name: "Inquiries, Investigations, and Immersions (3Is)" },
  { term: 2, name: "Introduction to World Religions and Belief Systems" },
  { term: 2, name: "Community Engagement, Solidarity and Citizenship" },
  { term: 2, name: "Work Immersion/Research/Culminating Activity" },
  { term: 3, name: "Physical Science" },
  { term: 3, name: "Contemporary Philippine Arts from the Regions" },
  { term: 3, name: "Introduction to the Philosophy of the Human Person" },
  { term: 3, name: "Physical Education and Health IV" },
  { term: 3, name: "Entrepreneurship" },
];

const { data: existing } = await admin
  .from("subjects")
  .select("id, subject_name")
  .eq("grade_level", 12)
  .eq("track_strand", "HUMSS");

const byName = new Map(
  (existing || []).map((row) => [String(row.subject_name).toLowerCase(), row])
);

let inserted = 0;
for (const item of SUBJECTS) {
  if (byName.has(item.name.toLowerCase())) continue;
  const { data, error } = await admin
    .from("subjects")
    .insert({
      subject_name: item.name,
      grade_level: 12,
      track_strand: "HUMSS",
      written_weight: 40,
      performance_weight: 40,
      assessment_weight: 20,
    })
    .select("id, subject_name")
    .single();
  if (error) {
    console.error("Subject insert failed:", item.name, error.message);
    process.exit(1);
  }
  byName.set(item.name.toLowerCase(), data);
  inserted += 1;
}

const { data: section } = await admin
  .from("sections")
  .select("id, section_name, school_year")
  .eq("grade_level", 12)
  .eq("school_year", "2025-2026")
  .eq("section_name", "HUMSS-A")
  .maybeSingle();

if (!section) {
  console.log(`Subjects ready (${inserted} new). HUMSS-A section not found; skip assignments.`);
  process.exit(0);
}

const { data: teacher } = await admin
  .from("teachers")
  .select("id, profiles(email)")
  .eq("teacher_id", "T26-10001")
  .maybeSingle();

let teacherId = teacher?.id;
if (!teacherId) {
  const { data: byEmail } = await admin
    .from("profiles")
    .select("id")
    .eq("email", "teacher.reyes@dmdpnhs.edu.ph")
    .maybeSingle();
  if (byEmail?.id) {
    const { data: row } = await admin
      .from("teachers")
      .select("id")
      .eq("profile_id", byEmail.id)
      .maybeSingle();
    teacherId = row?.id;
  }
}

if (!teacherId) {
  console.log(`Subjects ready (${inserted} new). Demo teacher not found; skip assignments.`);
  process.exit(0);
}

await admin.from("sections").update({ adviser_id: teacherId }).eq("id", section.id);

const subjectIds = SUBJECTS.map(
  (item) => byName.get(item.name.toLowerCase())?.id
).filter(Boolean);

let assigned = 0;
for (const subjectId of subjectIds) {
  const { error } = await admin.from("teacher_assignments").upsert(
    {
      teacher_id: teacherId,
      section_id: section.id,
      subject_id: subjectId,
      school_year: section.school_year,
    },
    { onConflict: "teacher_id,section_id,subject_id,school_year" }
  );
  if (error) {
    console.warn("Assignment:", error.message);
  } else {
    assigned += 1;
  }
}

console.log(
  `HUMSS G12 subjects: ${SUBJECTS.length} (${inserted} inserted). Assigned ${assigned} to HUMSS-A.`
);
