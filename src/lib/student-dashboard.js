/** Derive current enrollment term label from a date. */
export function getEnrollmentTermLabel(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11

  // PH school year typically starts June
  const startYear = month >= 5 ? year : year - 1;
  const endYear = startYear + 1;
  const schoolYear = `${startYear}-${endYear}`;

  // First semester: Jun–Oct; Second: Nov–Mar; Apr–May treated as end of second / summer
  let semester = "First Semester";
  if (month >= 10 || month <= 2) semester = "Second Semester";
  if (month >= 3 && month <= 4) semester = "Second Semester";

  return `${semester} · SY ${schoolYear}`;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatTimeLabel(time) {
  if (!time) return "";
  const [h, m] = String(time).slice(0, 5).split(":").map(Number);
  if (Number.isNaN(h)) return String(time).slice(0, 5);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m || 0).padStart(2, "0")} ${period}`;
}

export function formatScheduleLabel(rows = []) {
  if (!rows.length) return "TBA";
  return rows
    .map((row) => {
      const day = DAY_NAMES[row.day_of_week] ?? "Day";
      const start = formatTimeLabel(row.start_time);
      const end = formatTimeLabel(row.end_time);
      const room = row.room ? ` · ${row.room}` : "";
      return `${day} ${start}–${end}${room}`;
    })
    .join("; ");
}

export function toDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatLongDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TERM_ROMAN = { 1: "I", 2: "II", 3: "III" };

/** Student-facing term title, e.g. Term II. */
export function studentTermRomanLabel(term) {
  const n = Number(term);
  return `Term ${TERM_ROMAN[n] || n}`;
}

/**
 * Group order for enrolled subjects: Current → upcoming → Completed.
 * Term III upcoming is labeled "Starting on December" per school calendar.
 */
export function studentTermGroupMeta(term, currentTerm) {
  const n = Number(term);
  const current = Number(currentTerm) || 0;
  const title = studentTermRomanLabel(n);
  if (current && n === current) {
    return { term: n, title, status: "Current", heading: `${title} (Current)`, sort: 0 };
  }
  if (current && n > current) {
    const status = n === 3 ? "Starting on December" : "Upcoming";
    return {
      term: n,
      title,
      status,
      heading: `${title} (${status})`,
      sort: 1 + (n - current) * 0.1,
    };
  }
  if (current && n < current) {
    return {
      term: n,
      title,
      status: "Completed",
      heading: `${title} (Completed)`,
      sort: 2 + (current - n) * 0.1,
    };
  }
  return {
    term: n || 0,
    title: n ? title : "Subjects",
    status: "",
    heading: n ? title : "Subjects",
    sort: n || 99,
  };
}

export function groupSubjectsByStudentTerm(subjects = [], currentTerm) {
  const buckets = new Map();
  for (const subject of subjects || []) {
    const term =
      Number(subject.academic_term) ||
      Number(subject.term) ||
      0;
    const meta = studentTermGroupMeta(term, currentTerm);
    const key = meta.term || "other";
    if (!buckets.has(key)) {
      buckets.set(key, { ...meta, subjects: [] });
    }
    buckets.get(key).subjects.push(subject);
  }
  return Array.from(buckets.values()).sort((a, b) => a.sort - b.sort);
}

function mapScheduleTeacher(row) {
  const teacherProfile = row.teachers?.profiles;
  return {
    teacher_name: teacherProfile
      ? `${teacherProfile.first_name} ${teacherProfile.last_name}`
      : null,
    teacher_email: teacherProfile?.email || null,
    teacher_code: row.teachers?.teacher_id || null,
  };
}

/**
 * Map subject_id → assigned teacher for a section (from teacher_assignments).
 * Uses admin + flat profile hydrate so student RLS / embeds cannot hide faculty.
 */
async function loadSectionSubjectTeachers(sectionId, schoolYear) {
  if (!sectionId) return new Map();

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { SCHOOL_YEAR_DEFAULT } = await import("@/lib/constants");
    const admin = createAdminClient();
    const year = schoolYear || SCHOOL_YEAR_DEFAULT;

    let result = await admin
      .from("teacher_assignments")
      .select("id, teacher_id, subject_id, school_year")
      .eq("section_id", sectionId)
      .eq("school_year", year);

    if (result.error || !(result.data || []).length) {
      // Some loads omit year or use a different SY label — fall back to section only.
      result = await admin
        .from("teacher_assignments")
        .select("id, teacher_id, subject_id, school_year")
        .eq("section_id", sectionId);
    }

    const rows = result.data || [];
    if (!rows.length) return new Map();

    const teacherIds = [
      ...new Set(rows.map((r) => r.teacher_id).filter(Boolean)),
    ];
    const { data: teachers } = await admin
      .from("teachers")
      .select("id, teacher_id, profile_id")
      .in("id", teacherIds);
    const teacherById = new Map((teachers || []).map((t) => [t.id, t]));

    const profileIds = [
      ...new Set(
        (teachers || []).map((t) => t.profile_id).filter(Boolean)
      ),
    ];
    let profileById = new Map();
    if (profileIds.length) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", profileIds);
      profileById = new Map((profiles || []).map((p) => [p.id, p]));
    }

    const bySubject = new Map();
    for (const row of rows) {
      if (!row.subject_id || !row.teacher_id) continue;
      if (bySubject.has(row.subject_id)) continue;
      const teacher = teacherById.get(row.teacher_id);
      const profile = teacher?.profile_id
        ? profileById.get(teacher.profile_id)
        : null;
      const name = [profile?.first_name, profile?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      bySubject.set(row.subject_id, {
        teacher_name: name || null,
        teacher_email: profile?.email || null,
        teacher_code: teacher?.teacher_id || null,
      });
    }
    return bySubject;
  } catch {
    return new Map();
  }
}

function applyTeachersToSubjects(subjects, teachersBySubject) {
  if (!teachersBySubject?.size) return subjects;
  return subjects.map((subject) => {
    const assigned = teachersBySubject.get(subject.id);
    if (!assigned) return subject;
    return {
      ...subject,
      teacher_name: subject.teacher_name || assigned.teacher_name,
      teacher_email: subject.teacher_email || assigned.teacher_email,
      teacher_code: subject.teacher_code || assigned.teacher_code,
    };
  });
}

export async function loadStudentClassSchedule(supabase, student) {
  if (!student?.section_id) {
    return { periods: [], subjects: [] };
  }

  const schoolYear =
    student.sections?.school_year || student.school_year || null;

  const [teachersBySubject, scheduleResult] = await Promise.all([
    loadSectionSubjectTeachers(student.section_id, schoolYear),
    supabase
      .from("class_schedules")
      .select(
        `
      id,
      day_of_week,
      start_time,
      end_time,
      room,
      subject_id,
      subjects ( id, subject_name ),
      teachers (
        id,
        teacher_id,
        profiles ( first_name, last_name, email )
      )
    `
      )
      .eq("section_id", student.section_id)
      .order("day_of_week")
      .order("start_time"),
  ]);

  const { data: schedules, error } = scheduleResult;

  const periods = error
    ? []
    : (schedules || []).map((row) => {
        const subjectId = row.subject_id || row.subjects?.id;
        const fromSchedule = mapScheduleTeacher(row);
        const fromAssignment = subjectId
          ? teachersBySubject.get(subjectId)
          : null;
        return {
          id: row.id,
          day_of_week: row.day_of_week,
          start_time: row.start_time,
          end_time: row.end_time,
          room: row.room,
          subject_id: subjectId,
          subject_name: row.subjects?.subject_name || "Subject",
          teacher_name:
            fromSchedule.teacher_name || fromAssignment?.teacher_name || null,
          teacher_email:
            fromSchedule.teacher_email || fromAssignment?.teacher_email || null,
          teacher_code:
            fromSchedule.teacher_code || fromAssignment?.teacher_code || null,
        };
      });

  if (!periods.length) {
    // SHS: all-term subjects (UI groups Current / upcoming / Completed).
    try {
      const {
        listStudentEnrolledSubjects,
        listShsStrandSubjects,
      } = await import("@/lib/shs-subject-enrollment");
      const { SCHOOL_YEAR_DEFAULT, isSeniorHighGrade } = await import(
        "@/lib/constants"
      );
      const { humssSubjectTerm } = await import("@/lib/humss-academic-record");
      if (isSeniorHighGrade(student.grade_level)) {
        const strand = String(
          student.sections?.track_strand || student.track_strand || ""
        ).trim();
        const byId = new Map();

        const [catalog, enrolled] = await Promise.all([
          strand
            ? listShsStrandSubjects(supabase, {
                gradeLevel: student.grade_level,
                strand,
              })
            : Promise.resolve([]),
          listStudentEnrolledSubjects(supabase, {
            studentId: student.id,
            schoolYear: schoolYear || SCHOOL_YEAR_DEFAULT,
            term: null,
          }),
        ]);

        for (const subject of catalog) {
          byId.set(subject.id, {
            id: subject.id,
            subject_name: subject.subject_name,
            academic_term:
              Number(subject.academic_term) || humssSubjectTerm(subject) || null,
            schedule_label: "TBA",
            teacher_name: null,
            teacher_email: null,
            teacher_code: null,
          });
        }
        for (const subject of enrolled) {
          byId.set(subject.id, {
            id: subject.id,
            subject_name: subject.subject_name,
            academic_term:
              Number(subject.academic_term) ||
              humssSubjectTerm(subject) ||
              null,
            schedule_label: "TBA",
            teacher_name: null,
            teacher_email: null,
            teacher_code: null,
          });
        }

        if (byId.size) {
          return {
            periods: [],
            subjects: applyTeachersToSubjects(
              Array.from(byId.values()).sort(
                (a, b) =>
                  Number(a.academic_term || 99) -
                    Number(b.academic_term || 99) ||
                  String(a.subject_name).localeCompare(String(b.subject_name))
              ),
              teachersBySubject
            ),
          };
        }
      }
    } catch {
      /* enrollment helper optional */
    }

    const { humssSubjectTerm } = await import("@/lib/humss-academic-record");
    const { data: subjects } = await supabase
      .from("subjects")
      .select("id, subject_name, academic_term, track_strand")
      .eq("grade_level", student.grade_level || 0)
      .order("subject_name");

    let catalog = subjects || [];
    const strand = String(
      student.sections?.track_strand || student.track_strand || ""
    )
      .trim()
      .toUpperCase();
    if (strand) {
      const strandMatched = catalog.filter((s) => {
        const ts = String(s.track_strand || "").trim().toUpperCase();
        if (!ts) return String(s.academic_term || "") !== "";
        return ts === strand || ts.includes(strand);
      });
      if (strandMatched.length) catalog = strandMatched;
    }

    // Prefer subjects that already have a teacher load for this section.
    if (teachersBySubject.size) {
      const assignedOnly = catalog.filter((s) => teachersBySubject.has(s.id));
      if (assignedOnly.length) catalog = assignedOnly;
    }

    return {
      periods: [],
      subjects: applyTeachersToSubjects(
        catalog.map((subject) => ({
          id: subject.id,
          subject_name: subject.subject_name,
          academic_term:
            Number(subject.academic_term) || humssSubjectTerm(subject) || null,
          schedule_label: "TBA",
          teacher_name: null,
          teacher_email: null,
          teacher_code: null,
        })),
        teachersBySubject
      ),
    };
  }

  const { humssSubjectTerm } = await import("@/lib/humss-academic-record");
  const bySubject = new Map();
  for (const row of periods) {
    if (!row.subject_id) continue;
    if (!bySubject.has(row.subject_id)) {
      bySubject.set(row.subject_id, {
        id: row.subject_id,
        subject_name: row.subject_name,
        academic_term: humssSubjectTerm({
          subject_name: row.subject_name,
        }),
        scheduleRows: [],
        teacher_name: row.teacher_name,
        teacher_email: row.teacher_email,
        teacher_code: row.teacher_code,
      });
    }
    bySubject.get(row.subject_id).scheduleRows.push(row);
  }

  // Attach academic_term from subject catalog when schedule rows lack it.
  const subjectIds = Array.from(bySubject.keys());
  if (subjectIds.length) {
    const { data: subjectRows } = await supabase
      .from("subjects")
      .select("id, academic_term, subject_name")
      .in("id", subjectIds);
    for (const s of subjectRows || []) {
      const item = bySubject.get(s.id);
      if (!item) continue;
      item.academic_term =
        Number(s.academic_term) ||
        humssSubjectTerm(s) ||
        item.academic_term ||
        null;
    }
  }

  return {
    periods,
    subjects: applyTeachersToSubjects(
      Array.from(bySubject.values()).map((item) => ({
        id: item.id,
        subject_name: item.subject_name,
        academic_term: item.academic_term || null,
        schedule_label: formatScheduleLabel(item.scheduleRows),
        teacher_name: item.teacher_name,
        teacher_email: item.teacher_email,
        teacher_code: item.teacher_code,
      })),
      teachersBySubject
    ),
  };
}
