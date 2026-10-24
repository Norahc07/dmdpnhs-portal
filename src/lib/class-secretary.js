import { createAdminClient } from "@/lib/supabase/admin";
import {
  filterHumssAttendanceSubjects,
  isHumssAttendanceSubject,
  isHumssGrade12,
} from "@/lib/humss-academic-record";

function missingSecretaryColumn(error) {
  return /secretary_student_id/i.test(String(error?.message || ""));
}

export async function findSecretarySection(studentId) {
  if (!studentId) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sections")
    .select("id, section_name, grade_level, school_year, track_strand, secretary_student_id")
    .eq("secretary_student_id", studentId)
    .maybeSingle();

  if (error) {
    if (missingSecretaryColumn(error)) return null;
    return null;
  }
  return data || null;
}

export async function isSectionSecretary(studentId) {
  const section = await findSecretarySection(studentId);
  return Boolean(section?.id);
}

export async function getSectionSecretaryId(sectionId) {
  if (!sectionId) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sections")
    .select("secretary_student_id")
    .eq("id", sectionId)
    .maybeSingle();
  if (error || missingSecretaryColumn(error)) return null;
  return data?.secretary_student_id || null;
}

export async function assertTeacherCanMarkSection(admin, profileId, sectionId) {
  const { data: teacher } = await admin
    .from("teachers")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!teacher?.id) return { error: "Teacher record not found." };

  const { data: advisory } = await admin
    .from("sections")
    .select("id")
    .eq("id", sectionId)
    .eq("adviser_id", teacher.id)
    .maybeSingle();
  if (advisory?.id) return { ok: true, teacherId: teacher.id };

  const { data: assignment } = await admin
    .from("teacher_assignments")
    .select("id")
    .eq("teacher_id", teacher.id)
    .eq("section_id", sectionId)
    .limit(1)
    .maybeSingle();
  if (assignment?.id) return { ok: true, teacherId: teacher.id };

  return { error: "You can only mark attendance for sections you handle." };
}

export async function assertSecretaryCanMarkSection(
  admin,
  profileId,
  sectionId,
  subjectId
) {
  const { data: student } = await admin
    .from("students")
    .select("id, section_id, activation_status")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!student?.id) return { error: "Student record not found." };
  if (student.section_id !== sectionId) {
    return { error: "You can only mark attendance for your assigned section." };
  }
  if (student.activation_status !== "active") {
    return { error: "Your student portal must be activated first." };
  }

  const { data: section, error } = await admin
    .from("sections")
    .select("id, secretary_student_id, grade_level, section_name, track_strand")
    .eq("id", sectionId)
    .maybeSingle();

  if (error && missingSecretaryColumn(error)) {
    return {
      error:
        "Class secretary access is not enabled yet. Ask the registrar to apply the section-secretary SQL.",
    };
  }
  if (!section || section.secretary_student_id !== student.id) {
    return {
      error: "Your adviser has not given you class secretary access.",
    };
  }

  if (isHumssGrade12(section)) {
    if (!subjectId) {
      return {
        error: "Select a Term 2 subject to record attendance.",
      };
    }
    const { data: subject } = await admin
      .from("subjects")
      .select("id, subject_name, grade_level, track_strand")
      .eq("id", subjectId)
      .maybeSingle();
    if (!isHumssAttendanceSubject(subject)) {
      return {
        error:
          "Class secretary attendance is limited to Term 2 HUMSS subjects in your section.",
      };
    }
  } else if (subjectId) {
    return {
      error:
        "Class secretaries mark daily / homeroom attendance only. Subject periods stay with the teacher.",
    };
  }

  return { ok: true, studentId: student.id };
}

export async function assertHumssAttendanceSubject(admin, sectionId, subjectId) {
  const { data: section } = await admin
    .from("sections")
    .select("id, grade_level, section_name, track_strand")
    .eq("id", sectionId)
    .maybeSingle();
  if (!isHumssGrade12(section)) return { ok: true };
  if (!subjectId) {
    return { error: "Select a Term 2 subject to record attendance." };
  }
  const { data: subject } = await admin
    .from("subjects")
    .select("id, subject_name, grade_level, track_strand")
    .eq("id", subjectId)
    .maybeSingle();
  if (!isHumssAttendanceSubject(subject)) {
    return {
      error:
        "HUMSS attendance is limited to Term 2 subjects in this section.",
    };
  }
  return { ok: true };
}

export async function loadSecretarySubjects(section) {
  const humssSection = isHumssGrade12(section);
  if (!humssSection) return [];
  const admin = createAdminClient();
  const { data: assigned } = await admin
    .from("teacher_assignments")
    .select("subjects(id, subject_name, grade_level, track_strand)")
    .eq("section_id", section.id);
  let subjects = filterHumssAttendanceSubjects(
    (assigned || []).map((row) => row.subjects).filter(Boolean)
  );
  const seen = new Set();
  subjects = subjects.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
  if (!subjects.length) {
    const { data: catalog } = await admin
      .from("subjects")
      .select("id, subject_name, grade_level, track_strand")
      .eq("grade_level", 12)
      .eq("track_strand", "HUMSS");
    subjects = filterHumssAttendanceSubjects(catalog || []);
  }
  return subjects;
}

export async function loadSecretaryRoster(sectionId) {
  const admin = createAdminClient();
  const { data: students } = await admin
    .from("students")
    .select("id, lrn, profiles(first_name, last_name)")
    .eq("section_id", sectionId)
    .eq("activation_status", "active")
    .order("lrn");
  return students || [];
}

export async function loadSecretaryDayAttendance({
  sectionId,
  date,
  subjectId,
}) {
  const admin = createAdminClient();
  let query = admin
    .from("attendance")
    .select("id, student_id, status, subject_id")
    .eq("section_id", sectionId)
    .eq("date", date);

  if (subjectId) {
    query = query.eq("subject_id", subjectId);
  } else {
    query = query.is("subject_id", null);
  }

  let { data: attendance, error } = await query;
  if (error && /subject_id/i.test(String(error.message || ""))) {
    const fallback = await admin
      .from("attendance")
      .select("id, student_id, status")
      .eq("section_id", sectionId)
      .eq("date", date);
    attendance = fallback.data;
  }
  return attendance || [];
}
