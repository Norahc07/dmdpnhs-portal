/** Attendance helpers — subject-period aware day grouping */

export const ATTENDANCE_STATUS_META = {
  present: {
    label: "Present",
    short: "P",
    color: "#16a34a",
    chip: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
  },
  absent: {
    label: "Absent",
    short: "A",
    color: "#dc2626",
    chip: "bg-rose-100 text-rose-800 border-rose-200",
    dot: "bg-rose-500",
  },
  late: {
    label: "Tardy",
    short: "T",
    color: "#ca8a04",
    chip: "bg-amber-100 text-amber-900 border-amber-200",
    dot: "bg-amber-400",
  },
  excused: {
    label: "Excused",
    short: "E",
    color: "#2563eb",
    chip: "bg-sky-100 text-sky-800 border-sky-200",
    dot: "bg-sky-500",
  },
};

export const EXCUSE_REASON_TYPES = ["Illness", "Emergency", "Calamity"];

/** Priority for day summary color when multiple subjects exist */
const DAY_STATUS_PRIORITY = ["absent", "late", "excused", "present"];

/**
 * One color for the whole calendar day (not per-subject dots):
 * - Green  = all subjects Present
 * - Orange = Tardy/Late (usually 1st subject), no unexcused absence
 * - Blue   = Excused on some/all subjects (e.g. emergency), no unexcused absence
 * - Red    = any Unexcused Absent
 */
export function resolveDaySummary(periods = []) {
  if (!periods.length) return null;

  const hasAbsent = periods.some((p) => p.status === "absent");
  const hasLate = periods.some((p) => p.status === "late");
  const hasExcused = periods.some((p) => p.status === "excused");
  const allPresent = periods.every((p) => p.status === "present");

  if (hasAbsent) return "absent";
  if (hasLate) return "late";
  if (hasExcused) return "excused";
  if (allPresent) return "present";
  return DAY_STATUS_PRIORITY.find((s) =>
    periods.some((p) => p.status === s)
  ) || null;
}

export function todayDateKey(date = new Date()) {
  return toDateKey(date);
}

/** Prefer today; else nearest past day that has records. */
export function defaultHistoryDate(days = [], today = todayDateKey()) {
  if (days.some((d) => d.date === today)) return today;
  const past = [...days]
    .filter((d) => d.date <= today)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return past[0]?.date || days[0]?.date || today;
}

export function attendanceLabel(status) {
  return ATTENDANCE_STATUS_META[status]?.label || status || "—";
}

export function toDateKey(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function summarizeAttendance(records = []) {
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const tardy = records.filter((r) => r.status === "late").length;
  const excused = records.filter((r) => r.status === "excused").length;
  const total = records.length;
  const credited = present + tardy + excused;
  const rate = total > 0 ? Math.round((credited / total) * 100) : 0;
  return { present, absent, tardy, excused, total, rate };
}

/**
 * Group subject periods under each calendar day.
 * Design: calendar shows day summary + dots; table lists subject chips per day.
 */
export function groupAttendanceByDate(records = []) {
  const map = new Map();

  for (const row of records) {
    const dateKey = toDateKey(row.date);
    if (!dateKey) continue;
    if (!map.has(dateKey)) {
      map.set(dateKey, {
        date: dateKey,
        periods: [],
        summaryStatus: null,
      });
    }
    map.get(dateKey).periods.push(row);
  }

  const days = Array.from(map.values()).map((day) => {
    day.summaryStatus = resolveDaySummary(day.periods);
    day.stats = summarizeAttendance(day.periods);
    return day;
  });

  days.sort((a, b) => (a.date < b.date ? 1 : -1));
  return days;
}

export function recordsForMonth(records = [], month, year) {
  const m = Number(month);
  const y = Number(year);
  return (records || []).filter((r) => {
    const key = toDateKey(r.date);
    if (!key) return false;
    const [yy, mm] = key.split("-").map(Number);
    return yy === y && mm === m;
  });
}

export function buildMonthGrid(month, year) {
  const first = new Date(year, month - 1, 1);
  const startPad = first.getDay(); // 0 Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];

  for (let i = 0; i < startPad; i += 1) {
    cells.push({ key: `pad-${i}`, empty: true });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ key: date, empty: false, day, date });
  }
  return cells;
}

export function monthLabel(month, year) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
}

const DEMO_SUBJECTS = [
  "English",
  "Filipino",
  "Mathematics",
  "Science",
  "Araling Panlipunan",
  "MAPEH",
  "Values Education",
];

/**
 * Demo subject-period attendance for UI walkthrough when DB has no rows yet.
 */
export function buildDemoAttendanceRecords(month, year) {
  const m = Number(month);
  const y = Number(year);
  const daysInMonth = new Date(y, m, 0).getDate();
  const records = [];
  let seq = 0;

  // Clear day-type demos so calendar colors are easy to understand
  const patterns = [
    // Green — all present
    ["present", "present", "present", "present", "present", "present", "present"],
    // Orange — tardy on first subject only
    ["late", "present", "present", "present", "present", "present", "present"],
    // Blue — some present, rest excused (emergency / calamity)
    ["present", "present", "present", "excused", "excused", "excused", "excused"],
    // Red — unexcused absence on a subject
    ["present", "present", "absent", "present", "present", "present", "present"],
    // Green again
    ["present", "present", "present", "present", "present", "present", "present"],
  ];

  let patternIdx = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateObj = new Date(y, m - 1, day);
    const weekday = dateObj.getDay();
    if (weekday === 0 || weekday === 6) continue; // weekends off
    // Skip a few days to look realistic
    if (day % 11 === 0) continue;

    const date = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const pattern = patterns[patternIdx % patterns.length];
    patternIdx += 1;

    DEMO_SUBJECTS.forEach((subjectName, i) => {
      seq += 1;
      const status = pattern[i] || "present";
      records.push({
        id: `demo-${date}-${i}`,
        date,
        status,
        subject_id: `demo-sub-${i}`,
        subjectName,
        notes: null,
        excuse:
          status === "absent" && day % 5 === 0
            ? null
            : status === "absent"
              ? null
              : null,
        _demo: true,
      });
    });
  }

  return records;
}
