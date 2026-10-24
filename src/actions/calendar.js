"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadTeacherHandledSections } from "@/lib/announcements";
import { expandOfficialCalendarEvents } from "@/lib/deped-school-calendar";
import {
  birthdayEventForMonth,
  sortCalendarEvents,
  toDateKey,
} from "@/lib/portal-calendar";

/**
 * Load a full month of portal calendar items for students/teachers:
 * DB school events + yearly holidays/important dates + community birthdays.
 */
function decorateDbEvent(row, { role, teacherSectionIds, profileId }) {
  const isClass = Boolean(row.section_id);
  const category = isClass ? "teacher" : "official";
  const canManage =
    role === "registrar" ||
    (role === "teacher" &&
      isClass &&
      teacherSectionIds.has(row.section_id) &&
      (!row.created_by || row.created_by === profileId));
  return {
    ...row,
    dbId: row.id,
    source: isClass ? "teacher" : "registrar",
    category,
    originLabel: isClass ? "Class event" : "School calendar",
    sectionLabel: row.sections
      ? `Grade ${row.sections.grade_level} · ${row.sections.section_name}`
      : null,
    manageable: canManage,
  };
}

export async function getPortalCalendarMonth({
  year,
  month,
  viewerGradeLevel = null,
  viewerSectionId = null,
  viewerTeacherId = null,
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
  if (!["student", "teacher", "registrar"].includes(profile.role)) {
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

  let teacherSectionIds = new Set();
  let resolvedTeacherId = viewerTeacherId;
  if (profile.role === "teacher" && !resolvedTeacherId) {
    const { data: teacherRow } = await admin
      .from("teachers")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();
    resolvedTeacherId = teacherRow?.id || null;
  }
  if (profile.role === "teacher" && resolvedTeacherId) {
    const handled = await loadTeacherHandledSections(admin, resolvedTeacherId);
    teacherSectionIds = new Set(handled.map((s) => s.id));
  }

  let eventsQuery = admin
    .from("school_events")
    .select("*, sections(id, section_name, grade_level)")
    .gte("event_date", monthStart)
    .lte("event_date", monthEnd)
    .order("event_date")
    .order("start_time");

  let { data: rawEvents, error: eventsError } = await eventsQuery;
  if (eventsError && /sections/i.test(String(eventsError.message || ""))) {
    const fallback = await admin
      .from("school_events")
      .select("*")
      .gte("event_date", monthStart)
      .lte("event_date", monthEnd)
      .order("event_date")
      .order("start_time");
    rawEvents = fallback.data;
    eventsError = fallback.error;
  }

  if (eventsError) {
    rawEvents = [];
  }

  const decorateOpts = {
    role: profile.role,
    teacherSectionIds,
    profileId: profile.id,
  };

  let dbEvents = (rawEvents || []).map((row) =>
    decorateDbEvent(row, decorateOpts)
  );

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

  if (profile.role === "teacher" && teacherSectionIds.size) {
    dbEvents = dbEvents.filter(
      (event) => !event.section_id || teacherSectionIds.has(event.section_id)
    );
  }

  // Also expand DB events marked repeats_yearly (if column exists)
  let recurringExpanded = [];
  const recurringResult = await admin
    .from("school_events")
    .select("*, sections(id, section_name, grade_level)")
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
        if (
          profile.role === "teacher" &&
          teacherSectionIds.size &&
          row.section_id &&
          !teacherSectionIds.has(row.section_id)
        ) {
          return null;
        }
        const event_date = `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
        if (dbEvents.some((e) => e.dbId === row.id && e.event_date === event_date)) {
          return null;
        }
        return {
          ...decorateDbEvent(row, decorateOpts),
          id: `yearly-db-${row.id}-${y}`,
          event_date,
        };
      })
      .filter(Boolean);
  }

  const official = expandOfficialCalendarEvents(y, m);

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
    if (evt) {
      birthdayEvents.push({
        ...evt,
        category: "community",
        originLabel: "Community",
      });
    }
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
    if (evt) {
      birthdayEvents.push({
        ...evt,
        category: "community",
        originLabel: "Community",
      });
    }
  }

  const events = sortCalendarEvents([
    ...dbEvents,
    ...recurringExpanded,
    ...official,
    ...birthdayEvents,
  ]);

  const officialAll = events.filter((e) => e.category === "official");
  const classEvents = events.filter((e) => e.category === "teacher");

  return {
    year: y,
    month: m,
    events,
    counts: {
      holidays: officialAll.filter((e) => e.event_type === "holiday").length,
      exams: officialAll.filter((e) => e.event_type === "exam").length,
      enrollment: officialAll.filter((e) => e.event_type === "enrollment").length,
      official: officialAll.length,
      classEvents: classEvents.length,
      birthdays: birthdayEvents.length,
      important: officialAll.filter((e) => e.event_type === "deped").length,
      school: classEvents.length,
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
    const retryRow = { ...row };
    let shouldRetry = false;
    if (/repeats_yearly/i.test(error.message || "")) {
      delete retryRow.repeats_yearly;
      shouldRetry = true;
    }
    if (/section_id/i.test(error.message || "")) {
      delete retryRow.section_id;
      shouldRetry = true;
    }
    if (shouldRetry) {
      const retry = await auth.admin
        .from("school_events")
        .insert(retryRow)
        .select("id")
        .maybeSingle();
      if (retry.error) return { error: retry.error.message };
      revalidateCalendars();
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

const TEACHER_EVENT_TYPES = ["activity", "exam", "assignment", "school_event"];

async function requireTeacherCalendar() {
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
  if (!profile || profile.role !== "teacher") {
    return { error: "Only educators can add class calendar events." };
  }

  const admin = createAdminClient();
  const { data: teacher } = await admin
    .from("teachers")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!teacher?.id) return { error: "Teacher record not found." };

  const sections = await loadTeacherHandledSections(admin, teacher.id);
  return { profile, admin, teacherId: teacher.id, sections };
}

function revalidateCalendars() {
  revalidatePath("/registrar/calendar");
  revalidatePath("/student/calendar");
  revalidatePath("/teacher/calendar");
  revalidatePath("/student");
}

/** Teacher: add a class event for a section they handle. */
export async function createTeacherCalendarEvent(payload = {}) {
  const auth = await requireTeacherCalendar();
  if (auth.error) return { error: auth.error };

  const title = String(payload.title || "").trim();
  const eventType = String(payload.eventType || "activity").trim();
  const eventDate = String(payload.eventDate || "").trim().slice(0, 10);
  const description = String(payload.description || "").trim();
  const startTime = String(payload.startTime || "").trim() || null;
  const endTime = String(payload.endTime || "").trim() || null;
  const sectionId = String(payload.sectionId || "").trim();

  if (!title) return { error: "Enter an event title." };
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return { error: "Choose a valid event date." };
  }
  if (!TEACHER_EVENT_TYPES.includes(eventType)) {
    return { error: "Choose a class event type." };
  }
  const section = auth.sections.find((s) => s.id === sectionId);
  if (!section) {
    return { error: "Choose a section you handle." };
  }

  const row = {
    title,
    event_type: eventType,
    event_date: eventDate,
    description: description || null,
    start_time: startTime,
    end_time: endTime,
    grade_level: section.grade_level || null,
    section_id: section.id,
    created_by: auth.profile.id,
  };

  const { data, error } = await auth.admin
    .from("school_events")
    .insert(row)
    .select("id")
    .maybeSingle();

  if (error) {
    if (/created_by/i.test(error.message || "")) {
      delete row.created_by;
      const retry = await auth.admin
        .from("school_events")
        .insert(row)
        .select("id")
        .maybeSingle();
      if (retry.error) return { error: retry.error.message };
      revalidateCalendars();
      return { ok: true, id: retry.data?.id };
    }
    return { error: error.message };
  }

  revalidateCalendars();
  return { ok: true, id: data?.id };
}

/** Teacher: remove a class event from a section they handle. */
export async function deleteTeacherCalendarEvent(eventId) {
  const auth = await requireTeacherCalendar();
  if (auth.error) return { error: auth.error };

  const id = String(eventId || "").trim();
  if (!id) return { error: "Missing event id." };

  let { data: existing, error: findError } = await auth.admin
    .from("school_events")
    .select("id, section_id, created_by")
    .eq("id", id)
    .maybeSingle();
  if (findError && /created_by/i.test(findError.message || "")) {
    const fallback = await auth.admin
      .from("school_events")
      .select("id, section_id")
      .eq("id", id)
      .maybeSingle();
    existing = fallback.data;
    findError = fallback.error;
  }
  if (findError) return { error: findError.message };
  if (!existing) return { error: "Event not found." };
  if (!existing.section_id) {
    return { error: "Official school calendar events cannot be deleted here." };
  }
  const allowed = new Set(auth.sections.map((s) => s.id));
  if (!allowed.has(existing.section_id)) {
    return { error: "You can only manage events for sections you handle." };
  }
  if (existing.created_by && existing.created_by !== auth.profile.id) {
    return { error: "You can only delete class events you added." };
  }

  const { error } = await auth.admin.from("school_events").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidateCalendars();
  return { ok: true };
}
