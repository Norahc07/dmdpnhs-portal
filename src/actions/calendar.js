"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  YEARLY_HOLIDAYS,
  YEARLY_IMPORTANT_EVENTS,
  birthdayEventForMonth,
  expandYearlyItems,
  sortCalendarEvents,
  toDateKey,
} from "@/lib/portal-calendar";

/**
 * Load a full month of portal calendar items for students/teachers:
 * DB school events + yearly holidays/important dates + community birthdays.
 */
export async function getPortalCalendarMonth({
  year,
  month,
  viewerGradeLevel = null,
  viewerSectionId = null,
} = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return { error: "Profile not found" };
  if (!["student", "teacher", "registrar", "parent"].includes(profile.role)) {
    return { error: "Calendar is for portal members." };
  }

  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 0 || m > 11) {
    return { error: "Invalid month." };
  }

  const monthStart = toDateKey(new Date(y, m, 1));
  const monthEnd = toDateKey(new Date(y, m + 1, 0));
  const admin = createAdminClient();

  const { data: rawEvents, error: eventsError } = await admin
    .from("school_events")
    .select("*")
    .gte("event_date", monthStart)
    .lte("event_date", monthEnd)
    .order("event_date")
    .order("start_time");

  if (eventsError) {
    // Table may be missing on fresh installs — continue with yearly + birthdays
  }

  let dbEvents = (rawEvents || []).map((e) => ({
    ...e,
    source: "database",
    dbId: e.id,
    manageable: true,
  }));

  // Students only see grade/section-scoped items; school-wide (null) always show
  if (profile.role === "student") {
    dbEvents = dbEvents.filter((event) => {
      const gradeOk =
        event.grade_level == null ||
        event.grade_level === viewerGradeLevel;
      const sectionOk =
        event.section_id == null || event.section_id === viewerSectionId;
      return gradeOk && sectionOk;
    });
  }

  // Also expand DB events marked repeats_yearly (if column exists)
  let recurringExpanded = [];
  const recurringResult = await admin
    .from("school_events")
    .select("*")
    .eq("repeats_yearly", true);

  if (!recurringResult.error) {
    recurringExpanded = (recurringResult.data || [])
      .map((row) => {
        const raw = String(row.event_date || "").slice(0, 10);
        const [, mm, dd] = raw.split("-").map(Number);
        if (!mm || !dd || mm !== m + 1) return null;
        if (profile.role === "student") {
          const gradeOk =
            row.grade_level == null || row.grade_level === viewerGradeLevel;
          const sectionOk =
            row.section_id == null || row.section_id === viewerSectionId;
          if (!gradeOk || !sectionOk) return null;
        }
        const event_date = `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
        if (dbEvents.some((e) => e.dbId === row.id && e.event_date === event_date)) {
          return null;
        }
        return {
          ...row,
          id: `yearly-db-${row.id}-${y}`,
          dbId: row.id,
          event_date,
          source: "database_yearly",
          manageable: true,
        };
      })
      .filter(Boolean);
  }

  const holidays = expandYearlyItems(YEARLY_HOLIDAYS, y, m, "holiday");
  const important = expandYearlyItems(
    YEARLY_IMPORTANT_EVENTS,
    y,
    m,
    "important"
  );

  const [{ data: students }, { data: teachers }] = await Promise.all([
    admin
      .from("students")
      .select(
        "id, birthdate, profile_id, activation_status, profiles(first_name, last_name)"
      )
      .not("birthdate", "is", null),
    admin
      .from("teachers")
      .select("id, birthdate, profile_id, profiles(first_name, last_name)")
      .not("birthdate", "is", null),
  ]);

  const birthdayEvents = [];

  for (const s of students || []) {
    // Show activated / pending registered learners (skip rejected/inactive if set)
    if (
      s.activation_status &&
      !["active", "pending"].includes(s.activation_status)
    ) {
      continue;
    }
    const evt = birthdayEventForMonth({
      id: s.id,
      birthdate: s.birthdate,
      firstName: s.profiles?.first_name,
      lastName: s.profiles?.last_name,
      role: "student",
      year: y,
      month0: m,
      viewerProfileId: profile.id,
      profileId: s.profile_id,
    });
    if (evt) birthdayEvents.push(evt);
  }

  for (const t of teachers || []) {
    const evt = birthdayEventForMonth({
      id: t.id,
      birthdate: t.birthdate,
      firstName: t.profiles?.first_name,
      lastName: t.profiles?.last_name,
      role: "teacher",
      year: y,
      month0: m,
      viewerProfileId: profile.id,
      profileId: t.profile_id,
    });
    if (evt) birthdayEvents.push(evt);
  }

  const events = sortCalendarEvents([
    ...dbEvents,
    ...recurringExpanded,
    ...holidays,
    ...important,
    ...birthdayEvents,
  ]);

  return {
    year: y,
    month: m,
    events,
    counts: {
      holidays: holidays.length,
      important: important.length,
      birthdays: birthdayEvents.length,
      school: dbEvents.length + recurringExpanded.length,
    },
  };
}

const ALLOWED_EVENT_TYPES = [
  "school_event",
  "holiday",
  "important",
  "activity",
  "exam",
  "assignment",
];

async function requireRegistrar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "registrar") {
    return { error: "Only the registrar can manage school calendar events." };
  }

  return { profile, admin: createAdminClient() };
}

/**
 * Registrar-only: publish a special day / school event for the portal calendar.
 * School-wide (all users) when gradeLevel is empty.
 */
export async function createSchoolCalendarEvent(payload = {}) {
  const auth = await requireRegistrar();
  if (auth.error) return { error: auth.error };

  const title = String(payload.title || "").trim();
  const eventType = String(payload.eventType || "school_event").trim();
  const eventDate = String(payload.eventDate || "").trim().slice(0, 10);
  const description = String(payload.description || "").trim();
  const startTime = String(payload.startTime || "").trim() || null;
  const endTime = String(payload.endTime || "").trim() || null;
  const repeatsYearly = Boolean(payload.repeatsYearly);
  const gradeRaw = payload.gradeLevel;
  const gradeLevel =
    gradeRaw === "" || gradeRaw == null || gradeRaw === "all"
      ? null
      : Number(gradeRaw);

  if (!title) return { error: "Enter an event title." };
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return { error: "Choose a valid event date." };
  }
  if (!ALLOWED_EVENT_TYPES.includes(eventType)) {
    return { error: "Choose a valid event type." };
  }
  if (gradeLevel != null && ![7, 8, 9, 10, 11, 12].includes(gradeLevel)) {
    return { error: "Grade level must be 7–12 or All users." };
  }

  const row = {
    title,
    event_type: eventType,
    event_date: eventDate,
    description: description || null,
    start_time: startTime,
    end_time: endTime,
    grade_level: gradeLevel,
    section_id: null,
    repeats_yearly: repeatsYearly,
  };

  const { data, error } = await auth.admin
    .from("school_events")
    .insert(row)
    .select("id")
    .maybeSingle();

  if (error) {
    // Retry without repeats_yearly if column not migrated yet
    if (/repeats_yearly/i.test(error.message || "")) {
      delete row.repeats_yearly;
      const retry = await auth.admin
        .from("school_events")
        .insert(row)
        .select("id")
        .maybeSingle();
      if (retry.error) return { error: retry.error.message };
      revalidatePath("/registrar/calendar");
      revalidatePath("/student/calendar");
      revalidatePath("/teacher/calendar");
      return { ok: true, id: retry.data?.id };
    }
    return { error: error.message };
  }

  revalidatePath("/registrar/calendar");
  revalidatePath("/student/calendar");
  revalidatePath("/teacher/calendar");
  revalidatePath("/student");
  return { ok: true, id: data?.id };
}

/** Registrar-only: remove a published school calendar event. */
export async function deleteSchoolCalendarEvent(eventId) {
  const auth = await requireRegistrar();
  if (auth.error) return { error: auth.error };

  const id = String(eventId || "").trim();
  if (!id) return { error: "Missing event id." };

  const { error } = await auth.admin
    .from("school_events")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/registrar/calendar");
  revalidatePath("/student/calendar");
  revalidatePath("/teacher/calendar");
  revalidatePath("/student");
  return { ok: true };
}
