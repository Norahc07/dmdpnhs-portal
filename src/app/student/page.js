import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  EnrolledSubjectsPanel,
  StudentModuleGrid,
  StudentProfileBanner,
  TodaySchedulePanel,
} from "@/components/student/StudentDashboard";
import { requireRole } from "@/lib/auth-guard";
import {
  formatLongDate,
  getEnrollmentTermLabel,
  loadStudentClassSchedule,
  toDateKey,
} from "@/lib/student-dashboard";
import { expandOfficialCalendarEvents } from "@/lib/deped-school-calendar";

export const metadata = { title: "Student Dashboard" };

async function loadTodayEvents(supabase, student) {
  const now = new Date();
  const today = toDateKey(now);
  const { data, error } = await supabase
    .from("school_events")
    .select("*")
    .eq("event_date", today)
    .order("start_time", { ascending: true });

  const dbEvents = error
    ? []
    : (data || []).filter((event) => {
        const gradeOk =
          event.grade_level == null ||
          event.grade_level === student?.grade_level;
        const sectionOk =
          event.section_id == null || event.section_id === student?.section_id;
        return gradeOk && sectionOk;
      });

  const officialToday = expandOfficialCalendarEvents(
    now.getFullYear(),
    now.getMonth()
  ).filter((event) => event.event_date === today);

  return [...officialToday, ...dbEvents];
}

async function loadEnrolledSubjects(supabase, student) {
  const { subjects } = await loadStudentClassSchedule(supabase, student);
  return subjects;
}

export default async function StudentDashboardPage({ searchParams }) {
  const params = await searchParams;
  const { supabase, profile, studentAccess } = await requireRole("student");

  const { data: studentRow } = await supabase
    .from("students")
    .select("*")
    .eq("profile_id", profile.id)
    .maybeSingle();

  let section = null;
  if (studentRow?.section_id) {
    const { data } = await supabase
      .from("sections")
      .select("section_name, grade_level, school_year")
      .eq("id", studentRow.section_id)
      .maybeSingle();
    section = data;
  }
  const student = studentRow
    ? { ...studentRow, sections: section }
    : null;

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
      title="Dashboard"
      subtitle="Your student portal home — records, schedule, announcements, and account tools."
      studentAccess={{
        activated,
        enrolled,
        isSecretary: Boolean(studentAccess?.isSecretary),
        unreadAnnouncements: studentAccess?.unreadAnnouncements || 0,
      }}
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

        {Number(studentAccess?.unreadAnnouncements || 0) > 0 ? (
          <div className="rounded-xl border border-[#800000]/20 bg-[#800000]/5 px-4 py-3 text-sm text-[#3d1212]">
            <p className="font-semibold">New announcements</p>
            <p className="mt-1 text-[#3d1212]/80">
              You have {studentAccess.unreadAnnouncements} unread post
              {studentAccess.unreadAnnouncements === 1 ? "" : "s"} from your
              teachers.{" "}
              <Link
                href="/student/announcements"
                className="font-semibold text-[#800000] underline-offset-2 hover:underline"
              >
                Open announcements
              </Link>
            </p>
          </div>
        ) : null}

        {studentAccess?.isSecretary ? (
          <div className="rounded-xl border border-[#ffd700]/40 bg-[#ffd700]/15 px-4 py-3 text-sm text-[#3d1212]">
            <p className="font-semibold">Class secretary</p>
            <p className="mt-1 text-[#3d1212]/80">
              Your adviser gave you class secretary access for your assigned
              section. Attendance only — you cannot encode grades or use
              administrative tools.{" "}
              <Link
                href="/student/class-secretary"
                className="font-semibold text-[#800000] underline-offset-2 hover:underline"
              >
                Open class secretary
              </Link>
            </p>
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
          activated={activated}
          enrolled={enrolled}
        />

        <StudentModuleGrid
          studentAccess={{
            activated,
            enrolled,
            isSecretary: Boolean(studentAccess?.isSecretary),
            unreadAnnouncements: studentAccess?.unreadAnnouncements || 0,
          }}
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
