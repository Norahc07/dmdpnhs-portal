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

export async function loadStudentClassSchedule(supabase, student) {
  if (!student?.section_id) {
    return { periods: [], subjects: [] };
  }

  const { data: schedules, error } = await supabase
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
    .order("start_time");

  const periods = error
    ? []
    : (schedules || []).map((row) => ({
        id: row.id,
        day_of_week: row.day_of_week,
        start_time: row.start_time,
        end_time: row.end_time,
        room: row.room,
        subject_id: row.subject_id || row.subjects?.id,
        subject_name: row.subjects?.subject_name || "Subject",
        ...mapScheduleTeacher(row),
      }));

  if (!periods.length) {
    const { data: subjects } = await supabase
      .from("subjects")
      .select("id, subject_name")
      .eq("grade_level", student.grade_level || 0)
      .order("subject_name");

    return {
      periods: [],
      subjects: (subjects || []).map((subject) => ({
        id: subject.id,
        subject_name: subject.subject_name,
        schedule_label: "TBA",
        teacher_name: null,
        teacher_email: null,
        teacher_code: null,
      })),
    };
  }

  const bySubject = new Map();
  for (const row of periods) {
    if (!row.subject_id) continue;
    if (!bySubject.has(row.subject_id)) {
      bySubject.set(row.subject_id, {
        id: row.subject_id,
        subject_name: row.subject_name,
        scheduleRows: [],
        teacher_name: row.teacher_name,
        teacher_email: row.teacher_email,
        teacher_code: row.teacher_code,
      });
    }
    bySubject.get(row.subject_id).scheduleRows.push(row);
  }

  return {
    periods,
    subjects: Array.from(bySubject.values()).map((item) => ({
      id: item.id,
      subject_name: item.subject_name,
      schedule_label: formatScheduleLabel(item.scheduleRows),
      teacher_name: item.teacher_name,
      teacher_email: item.teacher_email,
      teacher_code: item.teacher_code,
    })),
  };
}
