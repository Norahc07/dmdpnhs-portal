import { createAdminClient } from "@/lib/supabase/admin";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import { GRADE_WORKFLOW } from "@/lib/grade-workflow";
import { termLabel } from "@/lib/grades-terms";

const PENDING_FACULTY = [
  {
    email: "teacher.pending.analytics1@dmdpnhs.edu.ph",
    first_name: "Marco",
    last_name: "Villanueva",
    // Teacher ID: T{YY}-{XXXXX} (5 unique digits)
    teacher_id: "T26-38417",
    faculty_dept: "English",
  },
  {
    email: "teacher.pending.analytics2@dmdpnhs.edu.ph",
    first_name: "Liza",
    last_name: "Domingo",
    teacher_id: "T26-59102",
    faculty_dept: "Science",
  },
  {
    email: "teacher.pending.analytics3@dmdpnhs.edu.ph",
    first_name: "Paolo",
    last_name: "Salazar",
    teacher_id: "T26-74628",
    faculty_dept: "Math",
  },
];

const PENDING_STUDENTS = [
  {
    email: "900000000001@student.dmdpnhs.edu.ph",
    lrn: "900000000001",
    first_name: "Kyle",
    last_name: "Ramirez",
    gender: "Male",
    grade_level: 7,
    contact_number: "09190000001",
    // Parent Access Code: P{YY}-{XXXXX} (5 unique digits)
    parent_code: "P26-48173",
    parent: {
      first_name: "Rosa",
      last_name: "Ramirez",
      phone: "09181110001",
      email: "rosa.ramirez.parent@email.com",
      relationship: "Mother",
    },
  },
  {
    email: "900000000002@student.dmdpnhs.edu.ph",
    lrn: "900000000002",
    first_name: "Mia",
    last_name: "Santos",
    gender: "Female",
    grade_level: 7,
    contact_number: "09190000002",
    parent_code: "P26-90258",
    parent: {
      first_name: "Carlos",
      last_name: "Santos",
      phone: "09182220002",
      email: "carlos.santos.parent@email.com",
      relationship: "Father",
    },
  },
  {
    email: "900000000003@student.dmdpnhs.edu.ph",
    lrn: "900000000003",
    first_name: "Noah",
    last_name: "Cruz",
    gender: "Male",
    grade_level: 8,
    contact_number: "09190000003",
    parent_code: "P26-13640",
    parent: {
      first_name: "Ana",
      last_name: "Cruz",
      phone: "09183330003",
      email: "ana.cruz.parent@email.com",
      relationship: "Mother",
    },
  },
  {
    email: "900000000004@student.dmdpnhs.edu.ph",
    lrn: "900000000004",
    first_name: "Ella",
    last_name: "Bautista",
    gender: "Female",
    grade_level: 8,
    contact_number: "09190000004",
    parent_code: "P26-75419",
    parent: {
      first_name: "Miguel",
      last_name: "Bautista",
      phone: "09184440004",
      email: "miguel.bautista.parent@email.com",
      relationship: "Father",
    },
  },
  {
    email: "900000000005@student.dmdpnhs.edu.ph",
    lrn: "900000000005",
    first_name: "Jared",
    last_name: "Lim",
    gender: "Male",
    grade_level: 9,
    contact_number: "09190000005",
    parent_code: "P26-62805",
    parent: {
      first_name: "Grace",
      last_name: "Lim",
      phone: "09185550005",
      email: "grace.lim.parent@email.com",
      relationship: "Mother",
    },
  },
];

async function findAuthUserIdByEmail(admin, email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return null;

  // Prefer Auth Admin email filter (avoids scanning all users)
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const res = await fetch(
        `${url}/auth/v1/admin/users?email=${encodeURIComponent(normalized)}`,
        {
          headers: {
            Authorization: `Bearer ${key}`,
            apikey: key,
          },
          cache: "no-store",
        }
      );
      if (res.ok) {
        const body = await res.json();
        const users = body?.users || (Array.isArray(body) ? body : []);
        const hit = users.find(
          (u) => String(u.email || "").toLowerCase() === normalized
        );
        if (hit?.id) return hit.id;
      }
    }
  } catch {
    // fall through to listUsers scan
  }

  for (let page = 1; page <= 10; page += 1) {
    const { data: listed } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    const users = listed?.users || [];
    const hit = users.find(
      (u) => String(u.email || "").toLowerCase() === normalized
    );
    if (hit?.id) return hit.id;
    if (users.length < 1000) break;
  }
  return null;
}

async function findOrCreateAuthUser(admin, { email, password, role, first_name, last_name }) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) throw new Error("Email required");

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();
  if (existingProfile?.id) return existingProfile.id;

  const existingAuthId = await findAuthUserIdByEmail(admin, normalized);
  if (existingAuthId) return existingAuthId;

  const { data, error } = await admin.auth.admin.createUser({
    email: normalized,
    password: password || "Parent@2026!",
    email_confirm: true,
    user_metadata: { role, first_name, last_name },
  });

  if (!error && data?.user?.id) return data.user.id;

  const msg = String(error?.message || "").toLowerCase();
  if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
    const hitId = await findAuthUserIdByEmail(admin, normalized);
    if (hitId) return hitId;
  }

  throw new Error(error?.message || `Could not create auth user for ${normalized}`);
}

async function ensurePendingFaculty(admin) {
  const { count } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "teacher")
    .eq("status", "pending");

  const needCreate = (count || 0) === 0;

  for (const row of PENDING_FACULTY) {
    try {
      // Always migrate demo Teacher IDs to T{YY}-{XXXXX} when these emails exist
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("email", row.email)
        .maybeSingle();

      if (profile?.id) {
        const { data: teacher } = await admin
          .from("teachers")
          .select("id, teacher_id")
          .eq("profile_id", profile.id)
          .maybeSingle();

        if (teacher?.id && teacher.teacher_id !== row.teacher_id) {
          await admin
            .from("teachers")
            .update({
              teacher_id: row.teacher_id,
              faculty_dept: row.faculty_dept,
            })
            .eq("id", teacher.id);
        }
        continue;
      }

      if (!needCreate) continue;

      const userId = await findOrCreateAuthUser(admin, {
        email: row.email,
        password: "Teacher@2026",
        role: "teacher",
        first_name: row.first_name,
        last_name: row.last_name,
      });

      await admin.from("profiles").upsert(
        {
          id: userId,
          role: "teacher",
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          status: "pending",
        },
        { onConflict: "id" }
      );

      const { data: teacher } = await admin
        .from("teachers")
        .select("id")
        .eq("profile_id", userId)
        .maybeSingle();

      if (!teacher) {
        await admin.from("teachers").insert({
          profile_id: userId,
          teacher_id: row.teacher_id,
          faculty_dept: row.faculty_dept,
          units: 18,
        });
      } else {
        await admin
          .from("teachers")
          .update({ teacher_id: row.teacher_id, faculty_dept: row.faculty_dept })
          .eq("id", teacher.id);
      }
    } catch (err) {
      console.error(
        "[ensurePendingFaculty] failed for",
        row.email,
        err?.message || err
      );
    }
  }
}

async function ensureParentForStudent(admin, studentId, row) {
  if (!studentId || !row?.parent) return;

  const parentEmail = String(
    row.parent.email ||
      `${String(row.parent_code || "parent").toLowerCase()}@parent.dmdpnhs.edu.ph`
  )
    .trim()
    .toLowerCase();

  const parentPayload = {
    phone_number: row.parent.phone,
    relationship: row.parent.relationship || "Guardian",
    email: parentEmail,
    access_code: row.parent_code,
  };

  let parentRowId = null;
  let profileId = null;

  // Prefer existing link for this student (migrates legacy demo codes like P26-ANL01)
  const { data: linkedRows } = await admin
    .from("parent_student_links")
    .select("parent_id, parents(id, profile_id)")
    .eq("student_id", studentId)
    .limit(1);

  const linked = linkedRows?.[0];
  if (linked?.parent_id) {
    parentRowId = linked.parent_id;
    const parentEmbed = Array.isArray(linked.parents)
      ? linked.parents[0]
      : linked.parents;
    profileId = parentEmbed?.profile_id || null;
  }

  if (!parentRowId) {
    const { data: byCode } = await admin
      .from("parents")
      .select("id, profile_id")
      .eq("access_code", row.parent_code)
      .maybeSingle();
    if (byCode?.id) {
      parentRowId = byCode.id;
      profileId = byCode.profile_id;
    }
  }

  if (parentRowId) {
    await admin.from("parents").update(parentPayload).eq("id", parentRowId);
    if (profileId) {
      await admin
        .from("profiles")
        .update({
          first_name: row.parent.first_name,
          last_name: row.parent.last_name,
          email: parentEmail,
          role: "parent",
          status: "active",
        })
        .eq("id", profileId);
    }
  } else {
    const parentUserId = await findOrCreateAuthUser(admin, {
      email: parentEmail,
      password: "Parent@2026!",
      role: "parent",
      first_name: row.parent.first_name,
      last_name: row.parent.last_name,
    });

    await admin.from("profiles").upsert(
      {
        id: parentUserId,
        role: "parent",
        first_name: row.parent.first_name,
        last_name: row.parent.last_name,
        email: parentEmail,
        status: "active",
      },
      { onConflict: "id" }
    );

    const { data: byProfile } = await admin
      .from("parents")
      .select("id")
      .eq("profile_id", parentUserId)
      .maybeSingle();

    if (byProfile?.id) {
      parentRowId = byProfile.id;
      await admin
        .from("parents")
        .update({ ...parentPayload, profile_id: parentUserId })
        .eq("id", parentRowId);
    } else {
      const { data: created, error: insErr } = await admin
        .from("parents")
        .insert({ ...parentPayload, profile_id: parentUserId })
        .select("id")
        .single();

      if (insErr) {
        const { data: retry } = await admin
          .from("parents")
          .select("id")
          .or(
            `profile_id.eq.${parentUserId},access_code.eq.${row.parent_code}`
          )
          .maybeSingle();
        if (!retry?.id) {
          throw new Error(`parent insert: ${insErr.message}`);
        }
        parentRowId = retry.id;
        await admin
          .from("parents")
          .update({ ...parentPayload, profile_id: parentUserId })
          .eq("id", parentRowId);
      } else {
        parentRowId = created.id;
      }
    }
  }

  if (!parentRowId) return;

  const { data: existingLinks } = await admin
    .from("parent_student_links")
    .select("parent_id")
    .eq("student_id", studentId);

  const alreadyLinked = (existingLinks || []).some(
    (l) => l.parent_id === parentRowId
  );
  if (alreadyLinked) return;

  if ((existingLinks || []).length > 0) {
    await admin
      .from("parent_student_links")
      .delete()
      .eq("student_id", studentId);
  }

  const { error: linkErr } = await admin.from("parent_student_links").insert({
    parent_id: parentRowId,
    student_id: studentId,
  });
  if (linkErr) {
    const linkMsg = String(linkErr.message || "").toLowerCase();
    if (!linkMsg.includes("duplicate") && !linkMsg.includes("unique")) {
      throw new Error(`parent link: ${linkErr.message}`);
    }
  }
}

async function ensurePendingActivations(admin) {
  const { data: section } = await admin
    .from("sections")
    .select("id")
    .eq("school_year", SCHOOL_YEAR_DEFAULT)
    .order("grade_level")
    .limit(1)
    .maybeSingle();

  const { count } = await admin
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("activation_status", "pending");

  const needStudents = (count || 0) === 0;
  // Fast path: queue already has pending rows — do not re-update every demo LRN.
  if (!needStudents) return;

  for (const row of PENDING_STUDENTS) {
    try {
      let studentId = null;

      const { data: existing } = await admin
        .from("students")
        .select("id")
        .eq("lrn", row.lrn)
        .maybeSingle();

      if (existing?.id) {
        studentId = existing.id;
      } else {
        const userId = await findOrCreateAuthUser(admin, {
          email: row.email,
          password: "demo123",
          role: "student",
          first_name: row.first_name,
          last_name: row.last_name,
        });

        await admin.from("profiles").upsert(
          {
            id: userId,
            role: "student",
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
            status: "pending",
          },
          { onConflict: "id" }
        );

        const { data: created, error } = await admin
          .from("students")
          .insert({
            profile_id: userId,
            lrn: row.lrn,
            gender: row.gender,
            birthdate: "2012-01-15",
            grade_level: row.grade_level,
            section_id: section?.id || null,
            status: "enrolled",
            activation_status: "pending",
            contact_number: row.contact_number,
            personal_email: `${row.first_name.toLowerCase()}.${row.last_name.toLowerCase()}@email.com`,
            parent_access_code_shown: row.parent_code,
          })
          .select("id")
          .single();

        if (error) {
          console.error(
            "[ensurePendingActivations] student insert",
            row.lrn,
            error.message
          );
          continue;
        }
        studentId = created.id;
      }

      if (studentId) {
        await ensureParentForStudent(admin, studentId, row);
      }
    } catch (err) {
      console.error(
        "[ensurePendingActivations] failed for",
        row.lrn,
        err?.message || err
      );
    }
  }
}

async function syncSectionHeadcountsFromStudents(admin) {
  const { data: sections } = await admin
    .from("sections")
    .select("id")
    .eq("school_year", SCHOOL_YEAR_DEFAULT);
  if (!sections?.length) return;

  const { data: enrolled } = await admin
    .from("students")
    .select("id, gender, section_id")
    .eq("status", "enrolled")
    .not("section_id", "is", null);

  const bySection = {};
  for (const s of enrolled || []) {
    if (!bySection[s.section_id]) {
      bySection[s.section_id] = { male: 0, female: 0 };
    }
    if (s.gender === "Male") bySection[s.section_id].male += 1;
    else if (s.gender === "Female") bySection[s.section_id].female += 1;
  }

  for (const section of sections) {
    const counts = bySection[section.id] || { male: 0, female: 0 };
    await admin
      .from("sections")
      .update({
        male_count: counts.male,
        female_count: counts.female,
      })
      .eq("id", section.id);
  }
}

function buildDemoStudentScores(seed = 0) {
  const base = 78 + (seed % 15);
  const term1 = Math.min(98, base + (seed % 5));
  const term2 = Math.min(98, base + ((seed + 2) % 6));
  const finalTerm = Math.round((term1 + term2) / 2);
  return {
    ww: Array.from({ length: 10 }, (_, i) => String(8 + ((seed + i) % 3))),
    pt: Array.from({ length: 10 }, (_, i) => String(7 + ((seed + i) % 4))),
    exams: { s1: String(term1 - 5), s2: String(term2 - 4), te: String(finalTerm) },
    term1: String(term1),
    term2: String(term2),
    finalTerm: String(finalTerm),
  };
}

/** Live demo: WW/PT filled; exams blank so students see min-to-pass predictions. */
function buildLiveDemoStudentScores(seed = 0) {
  return {
    ww: Array.from({ length: 10 }, (_, i) => String(7 + ((seed + i) % 4))),
    pt: Array.from({ length: 10 }, (_, i) => String(6 + ((seed + i) % 5))),
    exams: { s1: "", s2: "", te: "" },
    term1: "",
    term2: "",
    finalTerm: "",
  };
}

const GRADE_LOCK_DEMO_MARKER = "grade-lock-demo-v1";
const LIVE_GRADES_DEMO_MARKER = "live-grades-demo-v1";

/** Shared parent so /parent can open Orchid + live section kids in one login. */
const DEMO_GRADES_PARENT = {
  parent_code: "P26-GRADS",
  parent: {
    first_name: "Demo",
    last_name: "Guardian",
    phone: "09189990001",
    email: "parent.grades.demo@dmdpnhs.edu.ph",
    relationship: "Guardian",
  },
};

const GRADE_LOCK_DEMO_ROSTERS = [
  {
    sectionName: "Rose",
    gradeLevel: 7,
    mode: "locked",
    subjectNames: ["English", "Mathematics", "Science", "Filipino"],
    statuses: [
      GRADE_WORKFLOW.LOCKED,
      GRADE_WORKFLOW.LOCKED,
      GRADE_WORKFLOW.LOCKED,
      GRADE_WORKFLOW.LOCKED,
    ],
    learners: [
      { lrn: "910000000101", first_name: "Ava", last_name: "Reyes", gender: "Female" },
      { lrn: "910000000102", first_name: "Ben", last_name: "Cruz", gender: "Male" },
      { lrn: "910000000103", first_name: "Cara", last_name: "Lim", gender: "Female" },
      { lrn: "910000000104", first_name: "Diego", last_name: "Santos", gender: "Male" },
      { lrn: "910000000105", first_name: "Elena", last_name: "Garcia", gender: "Female" },
      { lrn: "910000000106", first_name: "Felix", last_name: "Torres", gender: "Male" },
    ],
  },
  {
    sectionName: "Orchid",
    gradeLevel: 8,
    // Fully locked — registrar Locked tab + student/parent real exam grades
    mode: "locked",
    subjectNames: ["English", "Mathematics", "Science", "Filipino"],
    statuses: [
      GRADE_WORKFLOW.LOCKED,
      GRADE_WORKFLOW.LOCKED,
      GRADE_WORKFLOW.LOCKED,
      GRADE_WORKFLOW.LOCKED,
    ],
    learners: [
      { lrn: "910000000201", first_name: "Gina", last_name: "Morales", gender: "Female" },
      { lrn: "910000000202", first_name: "Hugo", last_name: "Navarro", gender: "Male" },
      { lrn: "910000000203", first_name: "Ivy", last_name: "Pascual", gender: "Female" },
      { lrn: "910000000204", first_name: "Jake", last_name: "Ramos", gender: "Male" },
      { lrn: "910000000205", first_name: "Kara", last_name: "Villanueva", gender: "Female" },
      { lrn: "910000000206", first_name: "Leo", last_name: "Domingo", gender: "Male" },
    ],
  },
  {
    sectionName: "STEM ENGINEERING A",
    gradeLevel: 11,
    mode: "mixed",
    subjectNames: [
      "Oral Communication",
      "General Mathematics",
      "Earth and Life Science",
      "Personal Development",
    ],
    statuses: [
      GRADE_WORKFLOW.LOCKED,
      GRADE_WORKFLOW.SUBMITTED,
      GRADE_WORKFLOW.SUBMITTED,
      GRADE_WORKFLOW.SUBMITTED,
    ],
    learners: [
      { lrn: "910000000301", first_name: "Mia", last_name: "Alonzo", gender: "Female" },
      { lrn: "910000000302", first_name: "Noah", last_name: "Bautista", gender: "Male" },
      { lrn: "910000000303", first_name: "Olivia", last_name: "Castillo", gender: "Female" },
      { lrn: "910000000304", first_name: "Paul", last_name: "Dizon", gender: "Male" },
      { lrn: "910000000305", first_name: "Quinn", last_name: "Espiritu", gender: "Female" },
      { lrn: "910000000306", first_name: "Ryan", last_name: "Flores", gender: "Male" },
    ],
  },
];

/** Six live sections — draft class records, WW/PT visible, exams gated. */
const LIVE_GRADES_DEMO_ROSTERS = [
  {
    sectionName: "Lily",
    gradeLevel: 7,
    subjectNames: ["English", "Mathematics", "Science", "Filipino"],
    learners: [
      { lrn: "910000000401", first_name: "Sam", last_name: "Aquino", gender: "Male" },
      { lrn: "910000000402", first_name: "Tess", last_name: "Bernardo", gender: "Female" },
      { lrn: "910000000403", first_name: "Ulysses", last_name: "Chua", gender: "Male" },
      { lrn: "910000000404", first_name: "Vera", last_name: "Del Rosario", gender: "Female" },
    ],
  },
  {
    sectionName: "Daisy",
    gradeLevel: 7,
    subjectNames: ["English", "Mathematics", "Science", "Filipino"],
    learners: [
      { lrn: "910000000411", first_name: "Wes", last_name: "Enriquez", gender: "Male" },
      { lrn: "910000000412", first_name: "Xena", last_name: "Fajardo", gender: "Female" },
      { lrn: "910000000413", first_name: "Yuri", last_name: "Gomez", gender: "Male" },
      { lrn: "910000000414", first_name: "Zia", last_name: "Herrera", gender: "Female" },
    ],
  },
  {
    sectionName: "Jasmine",
    gradeLevel: 7,
    subjectNames: ["English", "Mathematics", "Science", "Filipino"],
    learners: [
      { lrn: "910000000421", first_name: "Alan", last_name: "Ibanez", gender: "Male" },
      { lrn: "910000000422", first_name: "Bella", last_name: "Javier", gender: "Female" },
      { lrn: "910000000423", first_name: "Chris", last_name: "Kwan", gender: "Male" },
      { lrn: "910000000424", first_name: "Dana", last_name: "Lopez", gender: "Female" },
    ],
  },
  {
    sectionName: "Tulip",
    gradeLevel: 8,
    subjectNames: ["English", "Mathematics", "Science", "Filipino"],
    learners: [
      { lrn: "910000000431", first_name: "Evan", last_name: "Miranda", gender: "Male" },
      { lrn: "910000000432", first_name: "Faye", last_name: "Natividad", gender: "Female" },
      { lrn: "910000000433", first_name: "Gabe", last_name: "Ocampo", gender: "Male" },
      { lrn: "910000000434", first_name: "Hana", last_name: "Perez", gender: "Female" },
    ],
  },
  {
    sectionName: "Sunflower",
    gradeLevel: 8,
    subjectNames: ["English", "Mathematics", "Science", "Filipino"],
    learners: [
      { lrn: "910000000441", first_name: "Ian", last_name: "Quinto", gender: "Male" },
      { lrn: "910000000442", first_name: "Jade", last_name: "Rivera", gender: "Female" },
      { lrn: "910000000443", first_name: "Ken", last_name: "Salazar", gender: "Male" },
      { lrn: "910000000444", first_name: "Lara", last_name: "Tan", gender: "Female" },
    ],
  },
  {
    sectionName: "Hibiscus",
    gradeLevel: 9,
    subjectNames: ["English", "Mathematics", "Science", "Filipino"],
    learners: [
      { lrn: "910000000451", first_name: "Marc", last_name: "Umbay", gender: "Male" },
      { lrn: "910000000452", first_name: "Nina", last_name: "Valdez", gender: "Female" },
      { lrn: "910000000453", first_name: "Owen", last_name: "Wong", gender: "Male" },
      { lrn: "910000000454", first_name: "Pia", last_name: "Yap", gender: "Female" },
    ],
  },
];

async function ensureDemoSection(admin, { sectionName, gradeLevel }) {
  const { data: existing } = await admin
    .from("sections")
    .select("id, section_name, grade_level, school_year")
    .eq("school_year", SCHOOL_YEAR_DEFAULT)
    .eq("grade_level", gradeLevel)
    .ilike("section_name", sectionName)
    .maybeSingle();
  if (existing?.id) return existing;

  const { data: created, error } = await admin
    .from("sections")
    .insert({
      section_name: sectionName,
      grade_level: gradeLevel,
      school_year: SCHOOL_YEAR_DEFAULT,
      capacity: 45,
      male_count: 0,
      female_count: 0,
    })
    .select("id, section_name, grade_level, school_year")
    .single();

  if (created?.id) return created;

  const { data: again } = await admin
    .from("sections")
    .select("id, section_name, grade_level, school_year")
    .eq("school_year", SCHOOL_YEAR_DEFAULT)
    .eq("grade_level", gradeLevel)
    .ilike("section_name", sectionName)
    .maybeSingle();
  if (again?.id) return again;

  if (error) {
    console.error("[ensureDemoSection]", sectionName, error.message);
  }
  return null;
}

function recentSchoolDates(count = 12) {
  const dates = [];
  const cursor = new Date();
  while (dates.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return dates;
}

async function ensureDemoAttendance(admin, { studentIds, sectionId, subjectId }) {
  if (!studentIds?.length || !sectionId) return;
  const dates = recentSchoolDates(12);
  const statuses = ["present", "present", "present", "late", "absent", "present"];

  for (let si = 0; si < studentIds.length; si += 1) {
    const studentId = studentIds[si];
    for (let di = 0; di < dates.length; di += 1) {
      const date = dates[di];
      const status = statuses[(si + di) % statuses.length];
      let existingQuery = admin
        .from("attendance")
        .select("id")
        .eq("student_id", studentId)
        .eq("date", date);
      if (subjectId) existingQuery = existingQuery.eq("subject_id", subjectId);
      else existingQuery = existingQuery.is("subject_id", null);

      const { data: existing } = await existingQuery.maybeSingle();
      if (existing?.id) {
        await admin
          .from("attendance")
          .update({ status, section_id: sectionId, subject_id: subjectId || null })
          .eq("id", existing.id);
        continue;
      }

      const payload = {
        student_id: studentId,
        section_id: sectionId,
        date,
        status,
        subject_id: subjectId || null,
      };
      const { error } = await admin.from("attendance").insert(payload);
      if (error && /subject_id/i.test(String(error.message || ""))) {
        await admin.from("attendance").insert({
          student_id: studentId,
          section_id: sectionId,
          date,
          status,
        });
      }
    }
  }
}

async function ensureDemoSubjects(admin, gradeLevel, subjectNames) {
  const out = [];
  for (const name of subjectNames) {
    const { data: matches } = await admin
      .from("subjects")
      .select("id, subject_name, grade_level")
      .eq("grade_level", gradeLevel)
      .eq("subject_name", name)
      .limit(1);
    const existing = matches?.[0];
    if (existing?.id) {
      out.push(existing);
      continue;
    }
    const { data: created, error } = await admin
      .from("subjects")
      .insert({
        subject_name: name,
        grade_level: gradeLevel,
        written_weight: 40,
        performance_weight: 40,
        assessment_weight: 20,
      })
      .select("id, subject_name, grade_level")
      .single();
    if (error || !created) {
      // Race: another insert won — fetch again
      const { data: again } = await admin
        .from("subjects")
        .select("id, subject_name, grade_level")
        .eq("grade_level", gradeLevel)
        .eq("subject_name", name)
        .limit(1);
      if (again?.[0]) out.push(again[0]);
      else console.error("[ensureDemoSubjects]", name, error?.message);
      continue;
    }
    out.push(created);
  }
  return out.sort((a, b) =>
    String(a.subject_name).localeCompare(String(b.subject_name))
  );
}

/** Keep one teacher_assignment per section+subject; drop extras + orphan class_records. */
async function dedupeSectionAssignments(admin, sectionId, keepSubjectIds) {
  const { data: rows } = await admin
    .from("teacher_assignments")
    .select("id, subject_id")
    .eq("section_id", sectionId)
    .eq("school_year", SCHOOL_YEAR_DEFAULT);

  const keep = new Set(keepSubjectIds || []);
  const seenSubject = new Set();
  const removeIds = [];

  for (const row of rows || []) {
    if (keep.size && !keep.has(row.subject_id)) {
      removeIds.push(row.id);
      continue;
    }
    if (seenSubject.has(row.subject_id)) {
      removeIds.push(row.id);
      continue;
    }
    seenSubject.add(row.subject_id);
  }

  for (const id of removeIds) {
    await admin.from("class_records").delete().eq("assignment_id", id);
    await admin.from("teacher_assignments").delete().eq("id", id);
  }
}

async function ensureDemoLearner(admin, section, learner) {
  const email = `${learner.lrn}@student.dmdpnhs.edu.ph`;
  const { data: existing } = await admin
    .from("students")
    .select("id, profile_id")
    .eq("lrn", learner.lrn)
    .maybeSingle();

  if (existing?.id) {
    await admin
      .from("students")
      .update({
        section_id: section.id,
        grade_level: section.grade_level,
        status: "enrolled",
        activation_status: "active",
        gender: learner.gender,
      })
      .eq("id", existing.id);
    if (existing.profile_id) {
      await admin
        .from("profiles")
        .update({
          first_name: learner.first_name,
          last_name: learner.last_name,
          status: "active",
          role: "student",
        })
        .eq("id", existing.profile_id);
    }
    return existing.id;
  }

  const userId = await findOrCreateAuthUser(admin, {
    email,
    password: "demo1234",
    role: "student",
    first_name: learner.first_name,
    last_name: learner.last_name,
  });

  await admin.from("profiles").upsert(
    {
      id: userId,
      role: "student",
      first_name: learner.first_name,
      last_name: learner.last_name,
      email,
      status: "active",
    },
    { onConflict: "id" }
  );

  const { data: created, error } = await admin
    .from("students")
    .insert({
      profile_id: userId,
      lrn: learner.lrn,
      gender: learner.gender,
      birthdate: "2012-06-15",
      grade_level: section.grade_level,
      section_id: section.id,
      status: "enrolled",
      activation_status: "active",
      contact_number: "09190000000",
      personal_email: `${learner.first_name.toLowerCase()}.${learner.last_name.toLowerCase()}@email.com`,
    })
    .select("id")
    .single();

  if (error) {
    // Race / unique LRN — fetch again
    const { data: again } = await admin
      .from("students")
      .select("id")
      .eq("lrn", learner.lrn)
      .maybeSingle();
    if (!again?.id) {
      console.error("[ensureDemoLearner]", learner.lrn, error.message);
      return null;
    }
    await admin
      .from("students")
      .update({
        section_id: section.id,
        grade_level: section.grade_level,
        status: "enrolled",
        activation_status: "active",
      })
      .eq("id", again.id);
    return again.id;
  }

  return created.id;
}

async function upsertClassRecordForAssignment({
  admin,
  assignmentId,
  teacher,
  section,
  subject,
  status,
  studentsPayload,
  demoMarker,
  examRevealDate = null,
  term = 1,
}) {
  const termNum = Number(term) || 1;
  const metadata = {
    schoolYear: SCHOOL_YEAR_DEFAULT,
    term: termLabel(termNum),
    subject: subject.subject_name,
    gradeSection: `Grade ${section.grade_level} - ${section.section_name}`,
    demo: demoMarker,
  };
  if (examRevealDate) metadata.examRevealDate = examRevealDate;

  const payload = {
    assignment_id: assignmentId,
    term: termNum,
    workflow_status: status,
    locked_at:
      status === GRADE_WORKFLOW.LOCKED ? new Date().toISOString() : null,
    submitted_at:
      status === GRADE_WORKFLOW.DRAFT ? null : new Date().toISOString(),
    updated_by: teacher.profile_id,
    data: {
      metadata,
      hps: {
        ww: Array.from({ length: 10 }, () => "10"),
        pt: Array.from({ length: 10 }, () => "10"),
        exams: { s1: "50", s2: "50", te: "100" },
      },
      students: studentsPayload,
    },
  };

  const { data: existingRec } = await admin
    .from("class_records")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("term", termNum)
    .maybeSingle();

  if (existingRec?.id) {
    await admin
      .from("class_records")
      .update({
        workflow_status: status,
        locked_at: payload.locked_at,
        submitted_at: payload.submitted_at,
        data: payload.data,
        updated_by: teacher.profile_id,
      })
      .eq("id", existingRec.id);
  } else {
    const { error: insErr } = await admin.from("class_records").insert(payload);
    if (insErr) {
      // Legacy DB without term column — try insert without term
      if (/term/i.test(String(insErr.message || ""))) {
        const { term: _t, ...legacy } = payload;
        await admin.from("class_records").insert(legacy);
      } else {
        console.error("[upsertClassRecordForAssignment]", insErr.message);
      }
    }
  }

  if (status === GRADE_WORKFLOW.LOCKED) {
    const gradeRows = [];
    for (const [studentId, scores] of Object.entries(studentsPayload)) {
      const field =
        termNum === 2 ? scores.term2 : termNum === 3 ? scores.finalTerm : scores.term1;
      const grade = Number(field);
      if (!Number.isFinite(grade)) continue;
      gradeRows.push({
        student_id: studentId,
        subject_id: subject.id,
        school_year: SCHOOL_YEAR_DEFAULT,
        quarter: termNum,
        final_transmuted_grade: grade,
        written_scores: [],
        performance_scores: [],
        assessment_score: null,
      });
    }
    if (gradeRows.length) {
      const { error: gErr } = await admin.from("grades").upsert(gradeRows, {
        onConflict: "student_id,subject_id,school_year,quarter",
      });
      if (gErr && !/school_year/i.test(gErr.message || "")) {
        const slim = gradeRows.map(
          ({ student_id, subject_id, quarter, final_transmuted_grade }) => ({
            student_id,
            subject_id,
            quarter,
            final_transmuted_grade,
            written_scores: [],
            performance_scores: [],
            assessment_score: null,
          })
        );
        await admin.from("grades").upsert(slim, {
          onConflict: "student_id,subject_id,quarter",
        });
      }
    }
  }
}

async function seedSectionRoster(admin, teachers, roster, options = {}) {
  const {
    mode = roster.mode || "locked",
    demoMarker = GRADE_LOCK_DEMO_MARKER,
    examRevealDate = null,
  } = options;

  const section = await ensureDemoSection(admin, {
    sectionName: roster.sectionName,
    gradeLevel: roster.gradeLevel,
  });
  if (!section) {
    console.warn(
      "[seedSectionRoster] missing section",
      roster.sectionName,
      roster.gradeLevel
    );
    return null;
  }

  const studentIds = [];
  for (const learner of roster.learners) {
    try {
      const id = await ensureDemoLearner(admin, section, learner);
      if (id) studentIds.push(id);
    } catch (err) {
      console.error(
        "[seedSectionRoster] learner",
        learner.lrn,
        err?.message || err
      );
    }
  }

  // Link first learner (and up to 2) to the shared demo parent for parent POV
  for (const sid of studentIds.slice(0, 2)) {
    try {
      await ensureParentForStudent(admin, sid, {
        parent_code: DEMO_GRADES_PARENT.parent_code,
        parent: DEMO_GRADES_PARENT.parent,
      });
    } catch (err) {
      console.error(
        "[seedSectionRoster] parent link",
        sid,
        err?.message || err
      );
    }
  }

  const subjectList = await ensureDemoSubjects(
    admin,
    roster.gradeLevel,
    roster.subjectNames
  );
  if (!subjectList.length || !studentIds.length) {
    return { section, studentIds, subjectList: [] };
  }

  await dedupeSectionAssignments(
    admin,
    section.id,
    subjectList.map((s) => s.id)
  );

  const statusBySubject = {};
  roster.subjectNames.forEach((name, idx) => {
    if (mode === "live") {
      statusBySubject[name] = GRADE_WORKFLOW.DRAFT;
    } else if (roster.statuses?.[idx]) {
      statusBySubject[name] = roster.statuses[idx];
    } else {
      statusBySubject[name] =
        idx % 2 === 0 ? GRADE_WORKFLOW.LOCKED : GRADE_WORKFLOW.SUBMITTED;
    }
  });

  const pairs = subjectList.map((subject) => ({
    subject,
    status: statusBySubject[subject.subject_name] || GRADE_WORKFLOW.DRAFT,
  }));

  let firstSubjectId = null;
  for (let i = 0; i < pairs.length; i += 1) {
    const { subject, status } = pairs[i];
    const teacher = teachers[i % teachers.length];
    if (!firstSubjectId) firstSubjectId = subject.id;

    let assignmentId;
    const { data: existingAsgs } = await admin
      .from("teacher_assignments")
      .select("id, teacher_id")
      .eq("section_id", section.id)
      .eq("subject_id", subject.id)
      .eq("school_year", SCHOOL_YEAR_DEFAULT)
      .limit(1);

    const existingAsg = existingAsgs?.[0];
    if (existingAsg?.id) {
      assignmentId = existingAsg.id;
    } else {
      const { data: createdAsg, error: asgErr } = await admin
        .from("teacher_assignments")
        .insert({
          teacher_id: teacher.id,
          section_id: section.id,
          subject_id: subject.id,
          school_year: SCHOOL_YEAR_DEFAULT,
        })
        .select("id")
        .single();
      if (asgErr || !createdAsg) {
        console.error("[seedSectionRoster] assignment", asgErr?.message);
        continue;
      }
      assignmentId = createdAsg.id;
    }

    const studentsPayload = {};
    studentIds.forEach((sid, idx) => {
      studentsPayload[sid] =
        mode === "live"
          ? buildLiveDemoStudentScores(i * 10 + idx)
          : buildDemoStudentScores(i * 10 + idx);
    });

    await upsertClassRecordForAssignment({
      admin,
      assignmentId,
      teacher,
      section,
      subject,
      status,
      studentsPayload,
      demoMarker,
      examRevealDate: mode === "live" ? examRevealDate : null,
      term: 1,
    });
  }

  await ensureDemoAttendance(admin, {
    studentIds,
    sectionId: section.id,
    subjectId: firstSubjectId,
  });

  return { section, studentIds, subjectList };
}

async function ensureGradeLockDemoData(admin) {
  const { error: workflowProbe } = await admin
    .from("class_records")
    .select("id", { count: "exact", head: true })
    .eq("workflow_status", GRADE_WORKFLOW.LOCKED);
  if (workflowProbe) {
    // Older DB without workflow_status
    return;
  }

  // Drop legacy empty demo records (no student grades) so the queue stays usable
  const { data: legacy } = await admin
    .from("class_records")
    .select("id, data, workflow_status")
    .in("workflow_status", [
      GRADE_WORKFLOW.LOCKED,
      GRADE_WORKFLOW.SUBMITTED,
      GRADE_WORKFLOW.SUBMITTED,
    ]);
  for (const row of legacy || []) {
    const students = row.data?.students || {};
    const note = row.data?.metadata?.note;
    if (
      Object.keys(students).length === 0 &&
      note === "analytics-demo-locked"
    ) {
      await admin.from("class_records").delete().eq("id", row.id);
    }
  }

  const { data: activeTeachers } = await admin
    .from("teachers")
    .select("id, profile_id, profiles!inner(status)")
    .eq("profiles.status", "active")
    .limit(12);

  const teachers = activeTeachers?.length
    ? activeTeachers
    : (
        await admin.from("teachers").select("id, profile_id").limit(12)
      ).data || [];

  if (!teachers.length) return;

  for (const roster of GRADE_LOCK_DEMO_ROSTERS) {
    await seedSectionRoster(admin, teachers, roster, {
      mode: roster.mode === "mixed" ? "mixed" : "locked",
      demoMarker: GRADE_LOCK_DEMO_MARKER,
    });
  }

  // Future exam reveal date — students see WW/PT live + min-to-pass predictions
  const examRevealDate = "2026-09-15";
  for (const roster of LIVE_GRADES_DEMO_ROSTERS) {
    await seedSectionRoster(admin, teachers, roster, {
      mode: "live",
      demoMarker: LIVE_GRADES_DEMO_MARKER,
      examRevealDate,
    });
  }

  await syncSectionHeadcountsFromStudents(admin);
}

const JUAN_MITO_MARKER = "juan-mitochondria-demo-v1";
const JUAN_LRN = "111111111111";

/** Place Juan Dela Cruz in G8 Mitochondria: Term 1 locked + Term 2 live class record. */
export async function ensureJuanMitochondriaDemo(admin) {
  const { data: student } = await admin
    .from("students")
    .select("id, profile_id, lrn, section_id")
    .eq("lrn", JUAN_LRN)
    .maybeSingle();
  if (!student?.id) {
    console.warn("[ensureJuanMitochondriaDemo] Juan not found (LRN", JUAN_LRN, ")");
    return { skipped: true, reason: "juan_missing" };
  }

  const section = await ensureDemoSection(admin, {
    sectionName: "MITOCHONDRIA",
    gradeLevel: 8,
  });
  if (!section) return { skipped: true, reason: "section_missing" };

  await admin
    .from("students")
    .update({
      section_id: section.id,
      grade_level: 8,
      status: "enrolled",
      activation_status: "active",
      personal_email: "juan.delacruz@gmail.com",
    })
    .eq("id", student.id);

  if (student.profile_id) {
    await admin
      .from("profiles")
      .update({
        first_name: "Juan",
        last_name: "Dela Cruz",
        status: "active",
        role: "student",
      })
      .eq("id", student.profile_id);
  }

  const { data: activeTeachers } = await admin
    .from("teachers")
    .select("id, profile_id, profiles!inner(status)")
    .eq("profiles.status", "active")
    .limit(8);

  const teacherList = activeTeachers?.length
    ? activeTeachers
    : (await admin.from("teachers").select("id, profile_id").limit(8)).data ||
      [];
  if (!teacherList.length) {
    return { skipped: true, reason: "no_teachers" };
  }

  const subjectNames = ["English", "Mathematics", "Science", "Filipino"];
  const subjectList = await ensureDemoSubjects(admin, 8, subjectNames);
  if (!subjectList.length) return { skipped: true, reason: "no_subjects" };

  await dedupeSectionAssignments(
    admin,
    section.id,
    subjectList.map((s) => s.id)
  );

  // A few classmates so the class record is realistic; student POV still shows Juan only
  const classmates = [
    { lrn: "910000000801", first_name: "Marco", last_name: "Reyes", gender: "Male" },
    { lrn: "910000000802", first_name: "Nina", last_name: "Santos", gender: "Female" },
    { lrn: "910000000803", first_name: "Omar", last_name: "Cruz", gender: "Male" },
  ];
  const studentIds = [student.id];
  for (const mate of classmates) {
    const id = await ensureDemoLearner(admin, section, mate);
    if (id) studentIds.push(id);
  }

  for (let i = 0; i < subjectList.length; i += 1) {
    const subject = subjectList[i];
    const teacher = teacherList[i % teacherList.length];

    let assignmentId;
    const { data: existingAsgs } = await admin
      .from("teacher_assignments")
      .select("id")
      .eq("section_id", section.id)
      .eq("subject_id", subject.id)
      .eq("school_year", SCHOOL_YEAR_DEFAULT)
      .limit(1);
    if (existingAsgs?.[0]?.id) {
      assignmentId = existingAsgs[0].id;
    } else {
      const { data: createdAsg, error: asgErr } = await admin
        .from("teacher_assignments")
        .insert({
          teacher_id: teacher.id,
          section_id: section.id,
          subject_id: subject.id,
          school_year: SCHOOL_YEAR_DEFAULT,
        })
        .select("id")
        .single();
      if (asgErr || !createdAsg) {
        console.error("[ensureJuanMitochondriaDemo] assignment", asgErr?.message);
        continue;
      }
      assignmentId = createdAsg.id;
    }

    // Term 1 — locked (published grades)
    const term1Students = {};
    studentIds.forEach((sid, idx) => {
      term1Students[sid] = buildDemoStudentScores(20 + i * 5 + idx);
    });
    await upsertClassRecordForAssignment({
      admin,
      assignmentId,
      teacher,
      section,
      subject,
      status: GRADE_WORKFLOW.LOCKED,
      studentsPayload: term1Students,
      demoMarker: JUAN_MITO_MARKER,
      term: 1,
    });

    // Term 2 — live class record (WW/PT visible; exams still gated)
    const term2Students = {};
    studentIds.forEach((sid, idx) => {
      term2Students[sid] = buildLiveDemoStudentScores(40 + i * 5 + idx);
    });
    await upsertClassRecordForAssignment({
      admin,
      assignmentId,
      teacher,
      section,
      subject,
      status: GRADE_WORKFLOW.DRAFT,
      studentsPayload: term2Students,
      demoMarker: JUAN_MITO_MARKER,
      examRevealDate: "2026-10-15",
      term: 2,
    });
  }

  // Unlock Juan's grades view for current demo term (system + each teacher subject)
  if (student.profile_id) {
    const evalPayloads = [
      {
        evaluator_profile_id: student.profile_id,
        evaluator_role: "student",
        evaluation_type: "system",
        school_year: SCHOOL_YEAR_DEFAULT,
        term: 1,
        scores: { access: 5, process: 5, distribution: 5, usability: 5, overall: 5 },
        average_score: 5,
        comments: "Demo unlock",
      },
      {
        evaluator_profile_id: student.profile_id,
        evaluator_role: "student",
        evaluation_type: "system",
        school_year: SCHOOL_YEAR_DEFAULT,
        term: 2,
        scores: { access: 5, process: 5, distribution: 5, usability: 5, overall: 5 },
        average_score: 5,
        comments: "Demo unlock",
      },
    ];
    for (const subject of subjectList) {
      const teacher = teacherList[subjectList.indexOf(subject) % teacherList.length];
      for (const term of [1, 2]) {
        evalPayloads.push({
          evaluator_profile_id: student.profile_id,
          evaluator_role: "student",
          evaluation_type: "teacher",
          school_year: SCHOOL_YEAR_DEFAULT,
          term,
          target_teacher_id: teacher.id,
          target_subject_id: subject.id,
          scores: {
            teaching: 5,
            fairness: 5,
            engagement: 5,
            communication: 5,
            overall: 5,
          },
          average_score: 5,
          comments: "Demo unlock",
        });
      }
    }
    for (const row of evalPayloads) {
      const { error } = await admin.from("evaluations").upsert(row, {
        onConflict:
          row.evaluation_type === "system"
            ? "evaluator_profile_id,school_year,term,evaluation_type"
            : "evaluator_profile_id,school_year,term,evaluation_type,target_teacher_id,target_subject_id",
      });
      if (error) {
        // Unique index names vary — insert-or-ignore via select
        const q = admin
          .from("evaluations")
          .select("id")
          .eq("evaluator_profile_id", row.evaluator_profile_id)
          .eq("school_year", row.school_year)
          .eq("term", row.term)
          .eq("evaluation_type", row.evaluation_type);
        const { data: hit } =
          row.evaluation_type === "system"
            ? await q.maybeSingle()
            : await q
                .eq("target_teacher_id", row.target_teacher_id)
                .eq("target_subject_id", row.target_subject_id)
                .maybeSingle();
        if (!hit?.id) {
          const { error: insErr } = await admin.from("evaluations").insert(row);
          if (insErr && !/duplicate|unique/i.test(insErr.message || "")) {
            console.error("[ensureJuanMitochondriaDemo] eval", insErr.message);
          }
        }
      }
    }
  }

  await ensureDemoAttendance(admin, {
    studentIds: [student.id],
    sectionId: section.id,
    subjectId: subjectList[0]?.id,
  });

  await syncSectionHeadcountsFromStudents(admin);
  return {
    ok: true,
    studentId: student.id,
    section: section.section_name,
    subjects: subjectList.length,
  };
}

/** Prevent concurrent page loads from racing Auth/parent inserts. */
let opsDemoInFlight = null;

/**
 * Opt-in demo seeder (REGISTRAR_OPS_DEMO=1). Never runs on normal page loads
 * unless explicitly enabled — seeding on every request was the main lag source.
 * Prefer `node scripts/seed-grade-lock-demo.mjs` for one-shot seeding.
 */
export async function ensureRegistrarOpsDemoData() {
  if (process.env.REGISTRAR_OPS_DEMO !== "1") {
    return { skipped: true };
  }

  if (opsDemoInFlight) return opsDemoInFlight;

  opsDemoInFlight = (async () => {
    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return { skipped: true, reason: "admin_unavailable" };
    }

    try {
      await ensurePendingFaculty(admin);
      await ensurePendingActivations(admin);
      await ensureGradeLockDemoData(admin);
      await ensureJuanMitochondriaDemo(admin);
      return { ok: true };
    } catch (err) {
      console.error("[ensureRegistrarOpsDemoData]", err);
      return { ok: false, error: String(err?.message || err) };
    }
  })();

  try {
    return await opsDemoInFlight;
  } finally {
    opsDemoInFlight = null;
  }
}

/** One-shot seed for scripts — always runs (does not require REGISTRAR_OPS_DEMO). */
export async function seedDemoGradesAttendanceParents() {
  const admin = createAdminClient();
  await ensurePendingFaculty(admin);
  await ensurePendingActivations(admin);
  await ensureGradeLockDemoData(admin);
  const juan = await ensureJuanMitochondriaDemo(admin);
  return { ok: true, juan };
}
