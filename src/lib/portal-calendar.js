/**
 * Portal calendar helpers — PH holidays, annual school events, birthdays.
 */

export const CALENDAR_EVENT_STYLES = {
  assignment: {
    dot: "bg-sky-500",
    badge: "bg-sky-100 text-sky-800 border-sky-200",
    label: "Assignment",
  },
  exam: {
    dot: "bg-rose-500",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    label: "Exam",
  },
  activity: {
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    label: "Activity",
  },
  school_event: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    label: "School event",
  },
  holiday: {
    dot: "bg-violet-500",
    badge: "bg-violet-100 text-violet-800 border-violet-200",
    label: "Holiday",
  },
  important: {
    dot: "bg-orange-500",
    badge: "bg-orange-100 text-orange-900 border-orange-200",
    label: "Important",
  },
  birthday: {
    dot: "bg-pink-500",
    badge: "bg-pink-100 text-pink-800 border-pink-200",
    label: "Birthday",
  },
  birthday_mine: {
    dot: "bg-[#800000]",
    badge: "bg-[#800000]/10 text-[#800000] border-[#800000]/20",
    label: "Your birthday",
  },
};

/** Fixed Philippine / school holidays shown every year (month 1–12, day). */
export const YEARLY_HOLIDAYS = [
  { month: 1, day: 1, title: "New Year’s Day", description: "Regular holiday" },
  {
    month: 2,
    day: 25,
    title: "EDSA People Power Revolution Anniversary",
    description: "Special non-working / commemorative day",
  },
  {
    month: 4,
    day: 9,
    title: "Araw ng Kagitingan",
    description: "Day of Valor — regular holiday",
  },
  { month: 5, day: 1, title: "Labor Day", description: "Regular holiday" },
  {
    month: 6,
    day: 12,
    title: "Independence Day",
    description: "Regular holiday",
  },
  {
    month: 8,
    day: 21,
    title: "Ninoy Aquino Day",
    description: "Special non-working holiday",
  },
  {
    month: 8,
    day: 25,
    title: "National Heroes Day (observance week)",
    description: "Usually last Monday of August — check official proclamation",
  },
  {
    month: 11,
    day: 1,
    title: "All Saints’ Day",
    description: "Special non-working holiday",
  },
  {
    month: 11,
    day: 2,
    title: "All Souls’ Day",
    description: "Special working / non-working depending on proclamation",
  },
  {
    month: 11,
    day: 30,
    title: "Bonifacio Day",
    description: "Regular holiday",
  },
  {
    month: 12,
    day: 8,
    title: "Feast of the Immaculate Conception",
    description: "Special non-working holiday",
  },
  {
    month: 12,
    day: 24,
    title: "Christmas Eve",
    description: "Special non-working holiday",
  },
  { month: 12, day: 25, title: "Christmas Day", description: "Regular holiday" },
  { month: 12, day: 30, title: "Rizal Day", description: "Regular holiday" },
  {
    month: 12,
    day: 31,
    title: "New Year’s Eve",
    description: "Special non-working holiday",
  },
];

/** Recurring school / DepEd-style important dates every year. */
export const YEARLY_IMPORTANT_EVENTS = [
  {
    month: 6,
    day: 1,
    title: "School year opening (typical)",
    description: "Classes usually open in June — confirm with school bulletin.",
  },
  {
    month: 6,
    day: 12,
    title: "Flag ceremony · Independence Day week",
    description: "School patriotism activities around Independence Day.",
  },
  {
    month: 8,
    day: 1,
    title: "Buwan ng Wika begins",
    description: "National Language Month activities.",
  },
  {
    month: 8,
    day: 19,
    title: "Buwan ng Wika culminating week",
    description: "School programs celebrating Filipino language and culture.",
  },
  {
    month: 9,
    day: 5,
    title: "First grading / mid-term checkpoint (typical)",
    description: "Check official grading schedule from the registrar.",
  },
  {
    month: 10,
    day: 5,
    title: "World Teachers’ Day",
    description: "Appreciate teachers and school staff.",
  },
  {
    month: 10,
    day: 24,
    title: "United Nations Day",
    description: "UN / cultural awareness school activities.",
  },
  {
    month: 11,
    day: 25,
    title: "National Reading Month highlight",
    description: "Reading campaigns and literacy activities.",
  },
  {
    month: 12,
    day: 15,
    title: "Christmas break (typical start)",
    description: "Confirm exact vacation dates with the school calendar.",
  },
  {
    month: 1,
    day: 6,
    title: "Classes resume after Christmas (typical)",
    description: "Confirm exact return date with the school bulletin.",
  },
  {
    month: 2,
    day: 14,
    title: "Valentine’s / Friendship Day activities",
    description: "Optional school social activities.",
  },
  {
    month: 3,
    day: 15,
    title: "Third grading / pre-final checkpoint (typical)",
    description: "Check official term dates from the registrar.",
  },
  {
    month: 4,
    day: 1,
    title: "Final examination period (typical)",
    description: "Confirm exact exam weeks with teachers / registrar.",
  },
  {
    month: 4,
    day: 15,
    title: "Graduation / moving-up season",
    description: "End-of-year ceremonies — watch school announcements.",
  },
  {
    month: 5,
    day: 15,
    title: "End of school year / enrollment prep",
    description: "Summer break and next SY enrollment window.",
  },
];

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function toDateKey(date) {
  if (!date) return "";
  if (typeof date === "string") return date.slice(0, 10);
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

export function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function safeDateKey(year, month1to12, day) {
  const daysInMonth = new Date(year, month1to12, 0).getDate();
  if (day < 1 || day > daysInMonth) return null;
  return `${year}-${pad2(month1to12)}-${pad2(day)}`;
}

export function expandYearlyItems(items, year, month0, eventType) {
  const month1 = month0 + 1;
  return items
    .filter((item) => item.month === month1)
    .map((item) => {
      const event_date = safeDateKey(year, item.month, item.day);
      if (!event_date) return null;
      return {
        id: `${eventType}-${item.month}-${item.day}-${year}`,
        title: item.title,
        description: item.description || null,
        event_type: eventType,
        event_date,
        start_time: null,
        end_time: null,
        source: "yearly",
      };
    })
    .filter(Boolean);
}

/**
 * Project a birthdate (any year) onto the viewed calendar year/month.
 */
export function birthdayEventForMonth({
  id,
  birthdate,
  firstName,
  lastName,
  role,
  year,
  month0,
  viewerProfileId,
  profileId,
}) {
  if (!birthdate) return null;
  const raw = String(birthdate).slice(0, 10);
  const parts = raw.split("-").map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [, bMonth, bDay] = parts;
  if (bMonth !== month0 + 1) return null;

  const event_date = safeDateKey(year, bMonth, bDay);
  if (!event_date) return null;

  const name = [firstName, lastName].filter(Boolean).join(" ") || "Community member";
  const isMine = viewerProfileId && profileId && viewerProfileId === profileId;
  const roleLabel = role === "teacher" ? "Teacher" : "Student";

  return {
    id: `birthday-${role}-${id}-${year}`,
    title: isMine ? `Your birthday 🎂` : `${name}'s birthday`,
    description: isMine
      ? "Happy birthday! Your special day is on the school calendar."
      : `${roleLabel} birthday reminder for the PastraPortal community.`,
    event_type: isMine ? "birthday_mine" : "birthday",
    event_date,
    start_time: null,
    end_time: null,
    source: "birthday",
    personRole: role,
    isMine: Boolean(isMine),
  };
}

export function styleForEventType(type) {
  return (
    CALENDAR_EVENT_STYLES[type] ||
    CALENDAR_EVENT_STYLES.activity
  );
}

export function sortCalendarEvents(events = []) {
  const order = {
    birthday_mine: 0,
    holiday: 1,
    important: 2,
    exam: 3,
    school_event: 4,
    assignment: 5,
    activity: 6,
    birthday: 7,
  };
  return [...events].sort((a, b) => {
    const dateCmp = String(a.event_date).localeCompare(String(b.event_date));
    if (dateCmp !== 0) return dateCmp;
    const ao = order[a.event_type] ?? 50;
    const bo = order[b.event_type] ?? 50;
    if (ao !== bo) return ao - bo;
    return String(a.title).localeCompare(String(b.title));
  });
}

export function groupEventsByDate(events = []) {
  return events.reduce((acc, event) => {
    const key = event.event_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});
}
