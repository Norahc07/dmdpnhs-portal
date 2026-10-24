/**
 * Force User Testing Guide demo accounts (docs/DMDPNHS-Portal-User-Testing-Guide §3).
 * Creates/resets Auth users, profiles, and minimal domain rows for login.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parentEmailFromCode,
  SCHOOL_YEAR_DEFAULT,
  studentEmailFromLrn,
} from "@/lib/constants";

const SECTION_ROSE_ID = "c0000000-0000-4000-8000-000000000001";

const DEMO_LRNS = [
  "111111111111",
  "222222222222",
  "333333333333",
  "444444444444",
  "555555555555",
  "666666666666",
  "777777777777",
  "888888888888",
];

async function findAuthUserIdByEmail(admin, email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return null;

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const res = await fetch(
        `${url}/auth/v1/admin/users?email=${encodeURIComponent(normalized)}`,
        {
          headers: { Authorization: `Bearer ${key}`, apikey: key },
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
    /* fall through */
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

/** Create or update Auth user and always reset password to the demo value. */
async function forceAuthUser(admin, { email, password, role, first_name, last_name }) {
  const normalized = String(email || "").trim().toLowerCase();
  let userId = await findAuthUserIdByEmail(admin, normalized);

  const meta = { role, first_name, last_name };

  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: meta,
    });
    if (error) throw new Error(`${normalized}: ${error.message}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: normalized,
      password,
      email_confirm: true,
      user_metadata: meta,
    });
    if (error) throw new Error(`${normalized}: ${error.message}`);
    userId = data.user.id;
  }

  await admin.from("profiles").upsert(
    {
      id: userId,
      role,
      first_name,
      last_name,
      email: normalized,
      status: role === "teacher" ? undefined : "active",
    },
    { onConflict: "id" }
  );

  return userId;
}

async function ensureRoseSection(admin) {
  const { data: existing } = await admin
    .from("sections")
    .select("id")
    .eq("section_name", "Rose")
    .eq("grade_level", 7)
    .eq("school_year", SCHOOL_YEAR_DEFAULT)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await admin
    .from("sections")
    .upsert(
      {
        id: SECTION_ROSE_ID,
        section_name: "Rose",
        grade_level: 7,
        school_year: SCHOOL_YEAR_DEFAULT,
      },
      { onConflict: "id" }
    )
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`section Rose: ${error.message}`);
  return data?.id || SECTION_ROSE_ID;
}

async function upsertStudentRow(admin, sectionId, row) {
  const email = studentEmailFromLrn(row.lrn);
  let profileId = null;

  if (row.registration_only) {
    const oldId = await findAuthUserIdByEmail(admin, email);
    if (oldId) {
      await admin.from("profiles").delete().eq("id", oldId);
      await admin.auth.admin.deleteUser(oldId);
    }
  } else {
    profileId = await forceAuthUser(admin, {
      email,
      password: row.password,
      role: "student",
      first_name: row.first_name,
      last_name: row.last_name,
    });
    await admin
      .from("profiles")
      .update({ status: row.profile_status || "active" })
      .eq("id", profileId);
  }

  const { data: existing } = await admin
    .from("students")
    .select("id")
    .eq("lrn", row.lrn)
    .maybeSingle();

  const payload = {
    lrn: row.lrn,
    profile_id: profileId,
    gender: row.gender,
    birthdate: row.birthdate,
    grade_level: 7,
    section_id: sectionId,
    status: "enrolled",
    activation_status: row.activation_status,
    contact_number: row.contact_number || null,
    personal_email: row.personal_email || null,
    parent_access_code_shown: row.parent_access_code_shown || null,
  };

  if (existing?.id) {
    const { error } = await admin.from("students").update(payload).eq("id", existing.id);
    if (error) throw new Error(`student ${row.lrn}: ${error.message}`);
    return existing.id;
  }

  const { data: inserted, error } = await admin
    .from("students")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(`student ${row.lrn}: ${error.message}`);
  return inserted.id;
}

const STUDENT_ROWS = [
  {
    lrn: "111111111111",
    password: "demo123",
    first_name: "Juan",
    last_name: "Dela Cruz",
    gender: "Male",
    birthdate: "2012-03-12",
    activation_status: "active",
    contact_number: "09171110001",
    parent_access_code_shown: "P26-10001",
  },
  {
    lrn: "222222222222",
    password: "demo123",
    first_name: "Pedro",
    last_name: "Reyes",
    gender: "Male",
    birthdate: "2012-07-21",
    activation_status: "active",
    contact_number: "09171110002",
  },
  {
    lrn: "333333333333",
    password: "demo123",
    first_name: "Ana",
    last_name: "Garcia",
    gender: "Female",
    birthdate: "2012-01-08",
    activation_status: "active",
    contact_number: "09171110003",
  },
  {
    lrn: "444444444444",
    password: "demo123",
    first_name: "Maria",
    last_name: "Lopez",
    gender: "Female",
    birthdate: "2012-11-30",
    activation_status: "active",
    contact_number: "09171110004",
  },
  {
    lrn: "555555555555",
    password: "demo123",
    first_name: "Carlo",
    last_name: "Mendoza",
    gender: "Male",
    birthdate: "2012-05-05",
    activation_status: "active",
    contact_number: "09171110005",
  },
  {
    lrn: "666666666666",
    password: "demo123",
    first_name: "Sofia",
    last_name: "Cruz",
    gender: "Female",
    birthdate: "2012-09-18",
    activation_status: "active",
    contact_number: "09171110006",
  },
  {
    lrn: "777777777777",
    password: "demo123",
    first_name: "Luis",
    last_name: "Torres",
    gender: "Male",
    birthdate: "2012-04-02",
    activation_status: "pending",
    profile_status: "pending",
    contact_number: "09171110007",
    parent_access_code_shown: "P26-10007",
  },
  {
    lrn: "888888888888",
    first_name: "Liza",
    last_name: "Navarro",
    gender: "Female",
    birthdate: "2012-06-14",
    activation_status: "incomplete",
    registration_only: true,
  },
];

export async function forceUserTestingDemoAccounts() {
  const admin = createAdminClient();
  const sectionId = await ensureRoseSection(admin);

  const registrarId = await forceAuthUser(admin, {
    email: "registrar@dmdpnhs.edu.ph",
    password: "Registrar@2026",
    role: "registrar",
    first_name: "School",
    last_name: "Registrar",
  });
  await admin
    .from("profiles")
    .update({ status: "active" })
    .eq("id", registrarId);

  const teacherId = await forceAuthUser(admin, {
    email: "teacher.reyes@dmdpnhs.edu.ph",
    password: "Teacher@2026",
    role: "teacher",
    first_name: "Ana",
    last_name: "Reyes",
  });
  await admin
    .from("profiles")
    .update({ status: "active" })
    .eq("id", teacherId);

  const { data: teacherRow } = await admin
    .from("teachers")
    .select("id")
    .eq("profile_id", teacherId)
    .maybeSingle();
  if (!teacherRow) {
    await admin.from("teachers").insert({
      profile_id: teacherId,
      teacher_id: "T26-10001",
      faculty_dept: "English",
      units: 18,
    });
  } else {
    await admin
      .from("teachers")
      .update({ teacher_id: "T26-10001", faculty_dept: "English" })
      .eq("id", teacherRow.id);
  }

  const pendingTeacherId = await forceAuthUser(admin, {
    email: "teacher.pending@dmdpnhs.edu.ph",
    password: "Pending@2026",
    role: "teacher",
    first_name: "Rico",
    last_name: "Santos",
  });
  await admin
    .from("profiles")
    .update({ status: "pending" })
    .eq("id", pendingTeacherId);

  const { data: pendingTeacherRow } = await admin
    .from("teachers")
    .select("id")
    .eq("profile_id", pendingTeacherId)
    .maybeSingle();
  if (!pendingTeacherRow) {
    await admin.from("teachers").insert({
      profile_id: pendingTeacherId,
      teacher_id: "T26-10002",
      faculty_dept: "Science",
      units: 12,
    });
  }

  const parentCode = "P26-10001";
  const parentEmail = parentEmailFromCode(parentCode);
  const parentProfileId = await forceAuthUser(admin, {
    email: parentEmail,
    password: parentCode,
    role: "parent",
    first_name: "Rosa",
    last_name: "Dela Cruz",
  });

  const studentIds = {};
  for (const row of STUDENT_ROWS) {
    studentIds[row.lrn] = await upsertStudentRow(admin, sectionId, row);
  }

  const { data: parentRow } = await admin
    .from("parents")
    .select("id")
    .eq("access_code", parentCode)
    .maybeSingle();

  let parentId = parentRow?.id;
  if (!parentId) {
    const { data: inserted, error } = await admin
      .from("parents")
      .insert({
        profile_id: parentProfileId,
        access_code: parentCode,
        phone_number: "09181234567",
        relationship: "Mother",
        email: "rosa.delacruz@email.com",
      })
      .select("id")
      .single();
    if (error) throw new Error(`parent: ${error.message}`);
    parentId = inserted.id;
  } else {
    await admin
      .from("parents")
      .update({ profile_id: parentProfileId, phone_number: "09181234567" })
      .eq("id", parentId);
  }

  const juanId = studentIds["111111111111"];
  if (juanId && parentId) {
    await admin.from("parent_student_links").upsert(
      { parent_id: parentId, student_id: juanId },
      { onConflict: "parent_id,student_id", ignoreDuplicates: true }
    );
  }

  const checks = {
    registrar: registrarId,
    teacher: teacherId,
    parent: parentProfileId,
    students: Object.keys(studentIds).length,
    sectionId,
    lrns: DEMO_LRNS,
  };

  return { ok: true, checks };
}
