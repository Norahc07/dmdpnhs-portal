/**
 * Official DepEd / Philippine school calendar dates shown on the portal.
 * Dated SY blocks follow published DepEd School Calendar patterns
 * (opening, quarterly exams, breaks, enrollment, end of SY).
 * Holidays include regular PH dates plus National Heroes Day (last Monday of August).
 */

function pad2(n) {
  return String(n).padStart(2, "0");
}

function dateKey(year, month1, day) {
  return `${year}-${pad2(month1)}-${pad2(day)}`;
}

function lastMondayOfMonth(year, month1) {
  const last = new Date(year, month1, 0);
  const offset = (last.getDay() + 6) % 7;
  last.setDate(last.getDate() - offset);
  return last.getDate();
}

function inMonth(iso, year, month0) {
  if (!iso) return false;
  const [y, m] = iso.split("-").map(Number);
  return y === year && m === month0 + 1;
}

export const OFFICIAL_EVENT_TYPES = {
  holiday: "holiday",
  activity: "activity",
  exam: "exam",
  enrollment: "enrollment",
  school_event: "school_event",
  deped: "deped",
};

/** Recurring Philippine holidays (month/day). National Heroes Day is computed. */
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
    month: 11,
    day: 1,
    title: "All Saints’ Day",
    description: "Special non-working holiday",
  },
  {
    month: 11,
    day: 2,
    title: "All Souls’ Day",
    description: "Special working or non-working per proclamation",
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

/** One-off or year-specific official dates (holidays that move, DepEd SY blocks). */
const DATED_OFFICIAL_EVENTS = [
  // Movable / proclaimed holidays 2025–2027
  {
    date: "2025-04-17",
    type: "holiday",
    title: "Maundy Thursday",
    description: "Regular holiday (Holy Week)",
  },
  {
    date: "2025-04-18",
    type: "holiday",
    title: "Good Friday",
    description: "Regular holiday (Holy Week)",
  },
  {
    date: "2026-04-02",
    type: "holiday",
    title: "Maundy Thursday",
    description: "Regular holiday (Holy Week)",
  },
  {
    date: "2026-04-03",
    type: "holiday",
    title: "Good Friday",
    description: "Regular holiday (Holy Week)",
  },
  {
    date: "2027-03-25",
    type: "holiday",
    title: "Maundy Thursday",
    description: "Regular holiday (Holy Week)",
  },
  {
    date: "2027-03-26",
    type: "holiday",
    title: "Good Friday",
    description: "Regular holiday (Holy Week)",
  },
  {
    date: "2026-02-17",
    type: "holiday",
    title: "Chinese New Year",
    description: "Special non-working holiday (subject to proclamation)",
  },
  {
    date: "2027-02-06",
    type: "holiday",
    title: "Chinese New Year",
    description: "Special non-working holiday (subject to proclamation)",
  },

  // SY 2025-2026 — DepEd School Calendar pattern
  {
    date: "2025-05-05",
    type: "enrollment",
    title: "Enrollment period begins (SY 2025-2026)",
    description: "Official enrollment window for incoming and continuing learners.",
  },
  {
    date: "2025-05-30",
    type: "enrollment",
    title: "Enrollment period ends (SY 2025-2026)",
    description: "Last typical day of the main enrollment window.",
  },
  {
    date: "2025-06-09",
    type: "activity",
    title: "Brigada Eskwela week",
    description: "National schools maintenance week before opening of classes.",
  },
  {
    date: "2025-06-16",
    type: "school_event",
    title: "Opening of classes (SY 2025-2026)",
    description: "Official start of the school year.",
  },
  {
    date: "2025-07-01",
    type: "activity",
    title: "Nutrition Month begins",
    description: "School nutrition and wellness activities for July.",
  },
  {
    date: "2025-08-01",
    type: "activity",
    title: "Buwan ng Wika begins",
    description: "National Language Month school activities.",
  },
  {
    date: "2025-08-18",
    type: "exam",
    title: "First quarter examinations",
    description: "Quarterly examination week (confirm exact days with the school).",
  },
  {
    date: "2025-10-05",
    type: "deped",
    title: "World Teachers’ Day",
    description: "Official DepEd observance honoring teachers.",
  },
  {
    date: "2025-10-20",
    type: "exam",
    title: "Second quarter examinations",
    description: "Quarterly examination week (confirm exact days with the school).",
  },
  {
    date: "2025-10-27",
    type: "school_event",
    title: "Mid-year break begins",
    description: "DepEd mid-year break for learners and teachers.",
  },
  {
    date: "2025-12-22",
    type: "school_event",
    title: "Christmas break begins",
    description: "Official Christmas vacation for the school year.",
  },
  {
    date: "2026-01-05",
    type: "school_event",
    title: "Classes resume after Christmas break",
    description: "Return to classes after the Christmas vacation.",
  },
  {
    date: "2026-01-26",
    type: "exam",
    title: "Third quarter examinations",
    description: "Quarterly examination week (confirm exact days with the school).",
  },
  {
    date: "2026-03-16",
    type: "exam",
    title: "Fourth quarter / final examinations",
    description: "End-of-year examination week (confirm exact days with the school).",
  },
  {
    date: "2026-03-31",
    type: "school_event",
    title: "End of school year (SY 2025-2026)",
    description: "Official last day of the school year.",
  },
  {
    date: "2026-04-02",
    type: "school_event",
    title: "Graduation / moving-up ceremonies",
    description: "End-of-year rites — confirm the school’s exact schedule.",
  },

  // SY 2026-2027 — DepEd School Calendar pattern
  {
    date: "2026-01-27",
    type: "enrollment",
    title: "Early registration (incoming learners)",
    description: "DepEd early registration for the next school year.",
  },
  {
    date: "2026-05-04",
    type: "enrollment",
    title: "Enrollment period begins (SY 2026-2027)",
    description: "Official enrollment window for incoming and continuing learners.",
  },
  {
    date: "2026-05-29",
    type: "enrollment",
    title: "Enrollment period ends (SY 2026-2027)",
    description: "Last typical day of the main enrollment window.",
  },
  {
    date: "2026-06-08",
    type: "activity",
    title: "Brigada Eskwela week",
    description: "National schools maintenance week before opening of classes.",
  },
  {
    date: "2026-06-15",
    type: "school_event",
    title: "Opening of classes (SY 2026-2027)",
    description: "Official start of the school year.",
  },
  {
    date: "2026-07-01",
    type: "activity",
    title: "Nutrition Month begins",
    description: "School nutrition and wellness activities for July.",
  },
  {
    date: "2026-08-01",
    type: "activity",
    title: "Buwan ng Wika begins",
    description: "National Language Month school activities.",
  },
  {
    date: "2026-08-17",
    type: "exam",
    title: "First quarter examinations",
    description: "Quarterly examination week (confirm exact days with the school).",
  },
  {
    date: "2026-10-05",
    type: "deped",
    title: "World Teachers’ Day",
    description: "Official DepEd observance honoring teachers.",
  },
  {
    date: "2026-10-24",
    type: "activity",
    title: "United Nations Day",
    description: "School UN / cultural awareness activities.",
  },
  {
    date: "2026-10-19",
    type: "exam",
    title: "Second quarter examinations",
    description: "Quarterly examination week (confirm exact days with the school).",
  },
  {
    date: "2026-10-26",
    type: "school_event",
    title: "Mid-year break begins",
    description: "DepEd mid-year break for learners and teachers.",
  },
  {
    date: "2026-11-25",
    type: "activity",
    title: "National Reading Month highlight",
    description: "Literacy and reading campaign activities.",
  },
  {
    date: "2026-12-21",
    type: "school_event",
    title: "Christmas break begins",
    description: "Official Christmas vacation for the school year.",
  },
  {
    date: "2027-01-04",
    type: "school_event",
    title: "Classes resume after Christmas break",
    description: "Return to classes after the Christmas vacation.",
  },
  {
    date: "2027-01-25",
    type: "exam",
    title: "Third quarter examinations",
    description: "Quarterly examination week (confirm exact days with the school).",
  },
  {
    date: "2027-03-15",
    type: "exam",
    title: "Fourth quarter / final examinations",
    description: "End-of-year examination week (confirm exact days with the school).",
  },
  {
    date: "2027-03-26",
    type: "school_event",
    title: "End of school year (SY 2026-2027)",
    description: "Official last day of the school year.",
  },
  {
    date: "2027-03-27",
    type: "school_event",
    title: "Graduation / moving-up ceremonies",
    description: "End-of-year rites — confirm the school’s exact schedule.",
  },
];

function officialEvent({ id, date, type, title, description }) {
  return {
    id,
    title,
    description: description || null,
    event_type: type,
    event_date: date,
    start_time: null,
    end_time: null,
    source: "official",
    category: "official",
    originLabel: "Official DepEd calendar",
    manageable: false,
  };
}

export function expandOfficialCalendarEvents(year, month0) {
  const events = [];

  for (const item of YEARLY_HOLIDAYS) {
    if (item.month !== month0 + 1) continue;
    events.push(
      officialEvent({
        id: `holiday-${item.month}-${item.day}-${year}`,
        date: dateKey(year, item.month, item.day),
        type: "holiday",
        title: item.title,
        description: item.description,
      })
    );
  }

  if (month0 + 1 === 8) {
    const day = lastMondayOfMonth(year, 8);
    events.push(
      officialEvent({
        id: `holiday-heroes-${year}`,
        date: dateKey(year, 8, day),
        type: "holiday",
        title: "National Heroes Day",
        description: "Regular holiday — last Monday of August",
      })
    );
  }

  for (const item of DATED_OFFICIAL_EVENTS) {
    if (!inMonth(item.date, year, month0)) continue;
    events.push(
      officialEvent({
        id: `deped-${item.date}-${item.title}`,
        date: item.date,
        type: item.type,
        title: item.title,
        description: item.description,
      })
    );
  }

  return events;
}
