"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ENROLLMENT_STATUSES,
  SCHOOL_YEAR_DEFAULT,
  SECTION_CAPACITY_DEFAULT,
  nextSchoolYear,
} from "@/lib/constants";

async function requireRegistrar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (me?.role !== "registrar") return { error: "Registrar only" };
  return { supabase, user, admin: createAdminClient() };
}

function revalidatePromotionPaths() {
  revalidatePath("/registrar/promotion");
  revalidatePath("/registrar/students");
  revalidatePath("/registrar/enrollment");
  revalidatePath("/registrar");
}

function isMissingEnrollmentsTable(error) {
  const msg = String(error?.message || error || "");
  return /enrollments/i.test(msg) && /does not exist|schema cache|Could not find/i.test(msg);
}

function sectionCapacity(section) {
  const n = Number(section?.capacity);
  return Number.isFinite(n) && n > 0 ? n : SECTION_CAPACITY_DEFAULT;
}

function sectionHeadcount(section) {
  return (Number(section?.male_count) || 0) + (Number(section?.female_count) || 0);
}

/** Average Final Term (Q3) grade across subjects for EOSY context. */
async function finalTermAverages(admin, studentIds, schoolYear) {
  if (!studentIds.length) return {};
  const { data } = await admin
    .from("grades")
    .select("student_id, final_transmuted_grade, quarter, school_year")
    .in("student_id", studentIds)
    .eq("quarter", 3);

  const byStudent = {};
  for (const row of data || []) {
    if (schoolYear && row.school_year && row.school_year !== schoolYear) continue;
    const g = Number(row.final_transmuted_grade);
    if (!Number.isFinite(g)) continue;
    if (!byStudent[row.student_id]) byStudent[row.student_id] = [];
    byStudent[row.student_id].push(g);
  }

  const averages = {};
  for (const [id, grades] of Object.entries(byStudent)) {
    const sum = grades.reduce((a, b) => a + b, 0);
    averages[id] = Math.round((sum / grades.length) * 10) / 10;
  }
  return averages;
}

async function enrollmentMapForStudents(admin, studentIds, schoolYear) {
  if (!studentIds.length) return { map: {}, available: true };
  const { data, error } = await admin
    .from("enrollments")
    .select("id, student_id, section_id, school_year, grade_level, status")
    .in("student_id", studentIds)
    .eq("school_year", schoolYear);

  if (error) {
    if (isMissingEnrollmentsTable(error)) {
      return { map: {}, available: false };
    }
    return { map: {}, available: true, error: error.message };
  }

  const map = {};
  for (const row of data || []) {
    map[row.student_id] = row;
  }
  return { map, available: true };
}

/**
 * Fetch students in a section for promotion UI, with Final Term avg + re-enrollment.
 */
export async function getStudentsForPromotion(sectionId, schoolYear) {
  const gate = await requireRegistrar();
  if (gate.error) return { error: gate.error };

  const { admin } = gate;
  const sy = schoolYear || SCHOOL_YEAR_DEFAULT;

  if (!sectionId) {
    return { students: [], enrollmentsAvailable: true };
  }

  const { data: section, error: secErr } = await admin
    .from("sections")
    .select("id, section_name, grade_level, school_year, capacity, male_count, female_count")
    .eq("id", sectionId)
    .maybeSingle();

  if (secErr) return { error: secErr.message };
  if (!section) return { error: "Section not found" };

  const { data: rows, error } = await admin
    .from("students")
    .select(
      `
      id,
      lrn,
      gender,
      grade_level,
      section_id,
      status,
      profiles ( first_name, last_name )
    `
    )
    .eq("section_id", sectionId)
    .order("lrn");

  if (error) return { error: error.message };

  const students = rows || [];
  const ids = students.map((s) => s.id);
  const averages = await finalTermAverages(admin, ids, sy);
  const targetYear = nextSchoolYear(sy);
  const { map: enrollments, available, error: enrErr } =
    await enrollmentMapForStudents(admin, ids, targetYear);

  if (enrErr) return { error: enrErr };

  return {
    section: {
      ...section,
      capacity: sectionCapacity(section),
      headcount: sectionHeadcount(section),
    },
    students: students.map((s) => {
      const enr = enrollments[s.id] || null;
      return {
        id: s.id,
        lrn: s.lrn,
        gender: s.gender || "—",
        grade_level: s.grade_level,
        section_id: s.section_id,
        eosyStatus: s.status || "enrolled",
        first_name: s.profiles?.first_name || "",
        last_name: s.profiles?.last_name || "",
        name: [s.profiles?.last_name, s.profiles?.first_name]
          .filter(Boolean)
          .join(", "),
        finalTermAverage: averages[s.id] ?? null,
        reEnrollmentStatus: enr?.status || null,
        enrollmentId: enr?.id || null,
        enrollmentSectionId: enr?.section_id || null,
      };
    }),
    enrollmentsAvailable: available,
  };
}

/** Target section roster + remaining capacity for the preview pane. */
export async function getTargetSectionPreview(sectionId) {
  const gate = await requireRegistrar();
  if (gate.error) return { error: gate.error };
  const { admin } = gate;

  if (!sectionId) {
    return { section: null, students: [], remaining: 0 };
  }

  const { data: section, error: secErr } = await admin
    .from("sections")
    .select("id, section_name, grade_level, school_year, capacity, male_count, female_count")
    .eq("id", sectionId)
    .maybeSingle();

  if (secErr) return { error: secErr.message };
  if (!section) return { error: "Target section not found" };

  const capacity = sectionCapacity(section);

  // Live students already assigned to this section
  const { data: liveRows, error: liveErr } = await admin
    .from("students")
    .select(
      `
      id, lrn, gender, status,
      profiles ( first_name, last_name )
    `
    )
    .eq("section_id", sectionId)
    .order("lrn");

  if (liveErr) return { error: liveErr.message };

  // Pending / official enrollments pointing at this section (may not have moved yet)
  let enrollmentRows = [];
  const { data: enrData, error: enrErr } = await admin
    .from("enrollments")
    .select(
      `
      id, student_id, status, school_year, grade_level,
      students (
        id, lrn, gender, status,
        profiles ( first_name, last_name )
      )
    `
    )
    .eq("section_id", sectionId);

  if (enrErr && !isMissingEnrollmentsTable(enrErr)) {
    return { error: enrErr.message };
  }
  if (!enrErr) enrollmentRows = enrData || [];

  const byId = new Map();
  for (const s of liveRows || []) {
    byId.set(s.id, {
      id: s.id,
      lrn: s.lrn,
      gender: s.gender || "—",
      eosyStatus: s.status || "enrolled",
      name: [s.profiles?.last_name, s.profiles?.first_name]
        .filter(Boolean)
        .join(", "),
      reEnrollmentStatus: null,
      source: "roster",
    });
  }

  for (const enr of enrollmentRows) {
    const s = enr.students;
    if (!s?.id) continue;
    const existing = byId.get(s.id);
    byId.set(s.id, {
      id: s.id,
      lrn: s.lrn || existing?.lrn,
      gender: s.gender || existing?.gender || "—",
      eosyStatus: s.status || existing?.eosyStatus || "enrolled",
      name:
        [s.profiles?.last_name, s.profiles?.first_name]
          .filter(Boolean)
          .join(", ") || existing?.name,
      reEnrollmentStatus: enr.status,
      source: existing ? "roster+enrollment" : "enrollment",
    });
  }

  const students = Array.from(byId.values()).sort((a, b) =>
    String(a.name).localeCompare(String(b.name))
  );
  const remaining = Math.max(0, capacity - students.length);

  return {
    section: {
      ...section,
      capacity,
      headcount: students.length,
      remaining,
    },
    students,
    remaining,
  };
}

/**
 * Batch promote eligible students into target section for the new school year.
 * Creates enrollments as Pending Confirmation and moves roster to target.
 */
export async function promoteStudentsBatch({
  studentIds,
  targetSectionId,
  newSchoolYear,
  newGradeLevel,
}) {
  const gate = await requireRegistrar();
  if (gate.error) return { error: gate.error };
  const { admin } = gate;

  const ids = Array.isArray(studentIds)
    ? [...new Set(studentIds.filter(Boolean))]
    : [];
  if (!ids.length) return { error: "Select at least one student." };
  if (!targetSectionId) return { error: "Choose a target section." };

  const { data: target, error: tErr } = await admin
    .from("sections")
    .select("id, section_name, grade_level, school_year, capacity, male_count, female_count")
    .eq("id", targetSectionId)
    .maybeSingle();

  if (tErr) return { error: tErr.message };
  if (!target) return { error: "Target section not found." };

  const gradeLevel = Number(newGradeLevel || target.grade_level);
  const schoolYear = newSchoolYear || target.school_year || nextSchoolYear();

  const { data: selected, error: sErr } = await admin
    .from("students")
    .select(
      "id, status, gender, lrn, section_id, profiles(first_name, last_name)"
    )
    .in("id", ids);

  if (sErr) return { error: sErr.message };

  const sourceSectionIds = [
    ...new Set((selected || []).map((s) => s.section_id).filter(Boolean)),
  ];

  const blocked = (selected || []).filter((s) => {
    const st = String(s.status || "").toLowerCase();
    return st === "retained" || st === "remedial";
  });

  if (blocked.length) {
    return {
      error: "blocked",
      blocked: blocked.map((s) => ({
        id: s.id,
        name: [s.profiles?.last_name, s.profiles?.first_name]
          .filter(Boolean)
          .join(", "),
        status: s.status,
      })),
      message:
        "Retained or unresolved Remedial students cannot be promoted. Resolve their EOSY status first.",
    };
  }

  const eligible = (selected || []).filter((s) => {
    const st = String(s.status || "").toLowerCase();
    return st === "promoted" || st === "enrolled";
  });

  if (!eligible.length) {
    return {
      error:
        "No eligible students. Only Promoted (or currently Enrolled) learners can be transferred.",
    };
  }

  const preview = await getTargetSectionPreview(targetSectionId);
  if (preview.error) return { error: preview.error };

  const capacity = sectionCapacity(target);
  const currentCount = preview.students?.length || 0;
  const alreadyInTarget = new Set((preview.students || []).map((s) => s.id));
  const incoming = eligible.filter((s) => !alreadyInTarget.has(s.id));
  if (currentCount + incoming.length > capacity) {
    return {
      error: "capacity",
      message: `Target section capacity exceeded (${currentCount + incoming.length}/${capacity}). Remove ${currentCount + incoming.length - capacity} learner(s) or choose another section.`,
      capacity,
      currentCount,
      incoming: incoming.length,
    };
  }

  const enrollmentRows = eligible.map((s) => ({
    student_id: s.id,
    section_id: targetSectionId,
    school_year: schoolYear,
    grade_level: gradeLevel,
    status: ENROLLMENT_STATUSES.PENDING,
    updated_at: new Date().toISOString(),
  }));

  const { error: upErr } = await admin.from("enrollments").upsert(enrollmentRows, {
    onConflict: "student_id,school_year",
  });

  if (upErr) {
    if (isMissingEnrollmentsTable(upErr)) {
      return {
        error:
          "Enrollments table is missing. Run supabase/enrollments-promotion.sql in Supabase, then retry.",
      };
    }
    return { error: upErr.message };
  }

  const { error: moveErr } = await admin
    .from("students")
    .update({
      section_id: targetSectionId,
      grade_level: gradeLevel,
      status: "promoted",
    })
    .in(
      "id",
      eligible.map((s) => s.id)
    );

  if (moveErr) return { error: moveErr.message };

  await syncSectionCounts(admin, [
    ...new Set([...sourceSectionIds, targetSectionId]),
  ]);

  revalidatePromotionPaths();
  return {
    ok: true,
    promoted: eligible.length,
    schoolYear,
    gradeLevel,
    targetSectionId,
  };
}

export async function confirmStudentEnrollment(studentId, schoolYear) {
  const gate = await requireRegistrar();
  if (gate.error) return { error: gate.error };
  const { admin } = gate;

  if (!studentId) return { error: "Student is required." };
  const sy = schoolYear || nextSchoolYear();

  const { data: enr, error: findErr } = await admin
    .from("enrollments")
    .select("id, student_id, section_id, grade_level, status, school_year")
    .eq("student_id", studentId)
    .eq("school_year", sy)
    .maybeSingle();

  if (findErr) {
    if (isMissingEnrollmentsTable(findErr)) {
      return {
        error:
          "Enrollments table is missing. Run supabase/enrollments-promotion.sql in Supabase.",
      };
    }
    return { error: findErr.message };
  }
  if (!enr) return { error: "No enrollment record found for this school year." };

  const nextStatus =
    enr.status === ENROLLMENT_STATUSES.OFFICIAL
      ? ENROLLMENT_STATUSES.PENDING
      : ENROLLMENT_STATUSES.OFFICIAL;

  const { error: updErr } = await admin
    .from("enrollments")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", enr.id);

  if (updErr) return { error: updErr.message };

  if (nextStatus === ENROLLMENT_STATUSES.OFFICIAL) {
    const studentUpdate = { status: "enrolled" };
    if (enr.section_id) studentUpdate.section_id = enr.section_id;
    if (enr.grade_level) studentUpdate.grade_level = enr.grade_level;
    await admin.from("students").update(studentUpdate).eq("id", studentId);
  }

  if (enr.section_id) await syncSectionCounts(admin, [enr.section_id]);

  revalidatePromotionPaths();
  return { ok: true, status: nextStatus };
}

async function syncSectionCounts(admin, sectionIds) {
  const ids = [...new Set((sectionIds || []).filter(Boolean))];
  for (const sectionId of ids) {
    const { data: roster } = await admin
      .from("students")
      .select("gender")
      .eq("section_id", sectionId)
      .eq("status", "enrolled");

    // Count all students in section regardless of promoted/enrolled for capacity
    const { data: all } = await admin
      .from("students")
      .select("gender")
      .eq("section_id", sectionId);

    const pool = all?.length ? all : roster || [];
    let male = 0;
    let female = 0;
    for (const s of pool) {
      if (s.gender === "Male") male += 1;
      else if (s.gender === "Female") female += 1;
    }
    await admin
      .from("sections")
      .update({ male_count: male, female_count: female })
      .eq("id", sectionId);
  }
}

/** List sections for source/target selectors (optionally by school year). */
export async function listPromotionSections(schoolYear) {
  const gate = await requireRegistrar();
  if (gate.error) return { error: gate.error };
  const { admin } = gate;

  let query = admin
    .from("sections")
    .select(
      "id, section_name, grade_level, school_year, capacity, male_count, female_count, track_strand"
    )
    .order("school_year")
    .order("grade_level")
    .order("section_name");

  if (schoolYear) query = query.eq("school_year", schoolYear);

  const { data, error } = await query;
  if (error) return { error: error.message };

  return {
    sections: (data || []).map((s) => ({
      ...s,
      capacity: sectionCapacity(s),
      headcount: sectionHeadcount(s),
      label: `Grade ${s.grade_level} · ${s.section_name} · SY ${s.school_year}`,
    })),
  };
}
