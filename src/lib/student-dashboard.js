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
