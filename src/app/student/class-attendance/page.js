import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AttendancePanel } from "@/components/teacher/AttendancePanel";
import { ClassAttendanceDateBar } from "@/components/student/ClassAttendanceDateBar";
import { requireSecretaryWorkspace } from "@/lib/auth-guard";
import {
  loadSecretaryDayAttendance,
  loadSecretaryRoster,
  loadSecretarySubjects,
} from "@/lib/class-secretary";
import { isHumssGrade12 } from "@/lib/humss-academic-record";

export const metadata = { title: "Record attendance" };

function classAttendanceHref({ date, subjectId }) {
  const q = new URLSearchParams();
  if (date) q.set("date", date);
  if (subjectId) q.set("subjectId", subjectId);
  const qs = q.toString();
  return qs ? `/student/class-attendance?${qs}` : "/student/class-attendance";
}

export default async function StudentClassAttendancePage({ searchParams }) {
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
    redirect(classAttendanceHref({ date, subjectId: subjects[0].id }));
  }

  const effectiveSubjectId = selectedSubject?.id || null;
  const attendance = await loadSecretaryDayAttendance({
    sectionId: section.id,
    date,
    subjectId: effectiveSubjectId,
  });
  const initialMap = Object.fromEntries(
    attendance.map((row) => [row.student_id, row.status])
  );

  return (
    <AppShell
      role="student"
      profile={profile}
      title="Record attendance"
      subtitle={`${sectionLabel} · record or update Present, Late, Absent, or Excused.`}
      studentAccess={studentAccess}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Assigned section only.{" "}
          <Link
            href="/student/class-attendance/history"
            className="font-semibold text-[#800000] underline-offset-2 hover:underline"
          >
            Open attendance history
          </Link>
        </p>
        <ClassAttendanceDateBar
          date={date}
          subjects={subjects}
          subjectId={effectiveSubjectId || ""}
          hideHomeroom={humssSection}
        />
        <AttendancePanel
          key={`${section.id}-${effectiveSubjectId || "homeroom"}-${date}`}
          students={students}
          sectionId={section.id}
          subjectId={effectiveSubjectId}
          date={date}
          initialMap={initialMap}
          sectionLabel={sectionLabel}
          subjectLabel={
            selectedSubject?.subject_name ||
            (humssSection ? "Select a Term 2 subject" : "Daily / Homeroom")
          }
        />
      </div>
    </AppShell>
  );
}
