import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ClassAttendanceDateBar } from "@/components/student/ClassAttendanceDateBar";
import { SecretarySectionHistory } from "@/components/student/SecretarySectionHistory";
import { requireSecretaryWorkspace } from "@/lib/auth-guard";
import {
  loadSecretaryDayAttendance,
  loadSecretaryRoster,
  loadSecretarySubjects,
} from "@/lib/class-secretary";
import { isHumssGrade12 } from "@/lib/humss-academic-record";

export const metadata = { title: "Attendance history" };

function historyHref({ date, subjectId }) {
  const q = new URLSearchParams();
  if (date) q.set("date", date);
  if (subjectId) q.set("subjectId", subjectId);
  const qs = q.toString();
  return qs
    ? `/student/class-attendance/history?${qs}`
    : "/student/class-attendance/history";
}

export default async function ClassSecretaryHistoryPage({ searchParams }) {
  const params = await searchParams;
  const { profile, studentAccess, section } =
    await requireSecretaryWorkspace();

  const today = new Date().toISOString().slice(0, 10);
  const date = String(params.date || today).slice(0, 10);
  const sectionLabel = `Grade ${section.grade_level} · ${section.section_name}`;
  const humssSection = isHumssGrade12(section);

  const [students, subjects] = await Promise.all([
    loadSecretaryRoster(section.id),
    loadSecretarySubjects(section),
  ]);

  const subjectId = params.subjectId ? String(params.subjectId) : "";
  const selectedSubject = subjects.find((row) => row.id === subjectId) || null;

  if (humssSection && subjects.length && !selectedSubject) {
    redirect(historyHref({ date, subjectId: subjects[0].id }));
  }

  const effectiveSubjectId = selectedSubject?.id || null;
  const attendance = await loadSecretaryDayAttendance({
    sectionId: section.id,
    date,
    subjectId: effectiveSubjectId,
  });
  const statusByStudent = Object.fromEntries(
    attendance.map((row) => [row.student_id, row.status])
  );

  const updateHref = (() => {
    const q = new URLSearchParams();
    q.set("date", date);
    if (effectiveSubjectId) q.set("subjectId", effectiveSubjectId);
    return `/student/class-attendance?${q.toString()}`;
  })();

  return (
    <AppShell
      role="student"
      profile={profile}
      title="Attendance history"
      subtitle={`${sectionLabel} · review marks for this section only.`}
      studentAccess={studentAccess}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          History stays on the date you pick.{" "}
          <Link
            href={updateHref}
            className="font-semibold text-[#800000] underline-offset-2 hover:underline"
          >
            Update this day
          </Link>
        </p>
        <ClassAttendanceDateBar
          date={date}
          subjects={subjects}
          subjectId={effectiveSubjectId || ""}
          hideHomeroom={humssSection}
          basePath="/student/class-attendance/history"
        />
        <SecretarySectionHistory
          date={date}
          students={students}
          statusByStudent={statusByStudent}
          sectionLabel={sectionLabel}
          subjectLabel={
            selectedSubject?.subject_name ||
            (humssSection ? "Select a Term 2 subject" : "Daily / Homeroom")
          }
          updateHref={updateHref}
        />
      </div>
    </AppShell>
  );
}
