import { AppShell } from "@/components/layout/AppShell";
import {
  EnrolledSubjectsPanel,
  StudentProfileBanner,
  TodaySchedulePanel,
} from "@/components/student/StudentDashboard";
import { requireRole } from "@/lib/auth-guard";
import {
  formatLongDate,
  formatScheduleLabel,
  getEnrollmentTermLabel,
  toDateKey,
} from "@/lib/student-dashboard";

export const metadata = { title: "Student Dashboard" };

async function loadTodayEvents(supabase, student) {
  const today = toDateKey(new Date());
  const { data, error } = await supabase
    .from("school_events")
    .select("*")
    .eq("event_date", today)
    .order("start_time", { ascending: true });

  if (error) return [];

  return (data || []).filter((event) => {
    const gradeOk =
      event.grade_level == null || event.grade_level === student?.grade_level;
    const sectionOk =
      event.section_id == null || event.section_id === student?.section_id;
    return gradeOk && sectionOk;
  });
}

async function loadEnrolledSubjects(supabase, student) {
  if (!student?.section_id) return [];

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

  if (error || !schedules?.length) {
    const { data: subjects } = await supabase
      .from("subjects")
      .select("id, subject_name")
      .eq("grade_level", student.grade_level || 0)
      .order("subject_name");

    return (subjects || []).map((subject) => ({
      id: subject.id,
      subject_name: subject.subject_name,
      schedule_label: "TBA",
      teacher_name: null,
      teacher_email: null,
      teacher_code: null,
    }));
  }

  const bySubject = new Map();
  for (const row of schedules) {
    const subjectId = row.subject_id || row.subjects?.id;
    if (!subjectId) continue;

    if (!bySubject.has(subjectId)) {
      const teacherProfile = row.teachers?.profiles;
      bySubject.set(subjectId, {
        id: subjectId,
        subject_name: row.subjects?.subject_name || "Subject",
        scheduleRows: [],
        teacher_name: teacherProfile
          ? `${teacherProfile.first_name} ${teacherProfile.last_name}`
          : null,
        teacher_email: teacherProfile?.email || null,
        teacher_code: row.teachers?.teacher_id || null,
      });
    }

    bySubject.get(subjectId).scheduleRows.push(row);
  }

  return Array.from(bySubject.values()).map((item) => ({
    id: item.id,
    subject_name: item.subject_name,
    schedule_label: formatScheduleLabel(item.scheduleRows),
    teacher_name: item.teacher_name,
    teacher_email: item.teacher_email,
    teacher_code: item.teacher_code,
  }));
}

export default async function StudentDashboardPage({ searchParams }) {
  const params = await searchParams;
  const { supabase, profile } = await requireRole("student");

  const { data: student } = await supabase
    .from("students")
    .select("*, sections(section_name, grade_level, school_year)")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const activated = student?.activation_status === "active";
  const enrolled =
    student?.status === "enrolled" ||
    student?.status === "promoted" ||
    Boolean(student?.section_id);
  const termLabel = getEnrollmentTermLabel(new Date());
  const isPending = student?.activation_status === "pending";

  const [todayEvents, subjects] = await Promise.all([
    activated ? loadTodayEvents(supabase, student) : Promise.resolve([]),
    activated && enrolled
      ? loadEnrolledSubjects(supabase, student)
      : Promise.resolve([]),
  ]);

  const notice = params?.notice;

  return (
    <AppShell
      role="student"
      profile={profile}
      studentAccess={{ activated, enrolled }}
    >
      <div className="space-y-5">
        {isPending ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">Temporary dashboard — awaiting verification</p>
            <p className="mt-1 text-amber-900/90">
              The registrar is verifying your personal details and will call your
              parent/guardian number. Grades and attendance unlock after activation
              and section enrollment. Keep your contact numbers accurate.
            </p>
          </div>
        ) : null}

        {notice === "activation" ? (
          <div className="rounded-xl border border-[#800000]/20 bg-[#800000]/5 px-4 py-3 text-sm text-[#3d1212]">
            Grades and attendance are available after the registrar activates your
            account.
          </div>
        ) : null}

        {notice === "enrollment" ? (
          <div className="rounded-xl border border-[#800000]/20 bg-[#800000]/5 px-4 py-3 text-sm text-[#3d1212]">
            Grades and attendance appear after you are enrolled in a section and
            subjects.
          </div>
        ) : null}

        {notice === "pending" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Profile submitted. Please wait for registrar verification. You can use
            this temporary dashboard meanwhile.
          </div>
        ) : null}

        <StudentProfileBanner
          profile={profile}
          student={student}
          termLabel={termLabel}
          enrolled={enrolled && activated}
        />

        {activated ? (
          <>
            <TodaySchedulePanel
              events={todayEvents}
              todayLabel={formatLongDate(new Date())}
            />
            <EnrolledSubjectsPanel subjects={subjects} />
          </>
        ) : (
          <section className="rounded-2xl border border-dashed border-[#800000]/20 bg-white p-6 text-sm text-muted-foreground">
            <p className="font-heading text-base font-bold text-[#3d1212]">
              Limited access until activation
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>Schedule, subjects, grades, and attendance stay locked.</li>
              <li>
                Registrar must confirm your record and that the parent contact
                number works.
              </li>
              <li>
                After approval, DMDPNHS will SMS your parent an Access Code and
                notify you on the number you submitted.
              </li>
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}
