import { LayoutGrid } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EvaluationProgressCard } from "@/components/evaluation/EvaluationProgressCard";
import { StudentClassRecordSemestralView } from "@/components/student/StudentClassRecordSemestralView";
import { getStudentSemestralGrades } from "@/actions/student-grades";
import { getStudentGradesUnlockStatus } from "@/actions/evaluation";
import { requireRole } from "@/lib/auth-guard";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import { currentEvaluationTerm } from "@/lib/evaluation";

export const metadata = { title: "My Grades" };

export default async function StudentGradesPage() {
  const { supabase, profile } = await requireRole([
    "student",
    "student-enrolled",
  ]);

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, grade_level, section_id, sections(section_name, grade_level, school_year)"
    )
    .eq("profile_id", profile.id)
    .maybeSingle();

  const studentId = student?.id;
  const schoolYear = student?.sections?.school_year || SCHOOL_YEAR_DEFAULT;
  const unlockTerm = currentEvaluationTerm();

  const unlock = studentId
    ? await getStudentGradesUnlockStatus({
        schoolYear,
        term: unlockTerm,
      })
    : { unlocked: false, progress: null };

  const semestral = studentId
    ? await getStudentSemestralGrades({ studentId, schoolYear })
    : { rows: [], error: null };

  const sectionLabel = student?.sections
    ? `Grade ${student.sections.grade_level ?? student.grade_level ?? "—"} - ${student.sections.section_name}`
    : "Not yet assigned";

  const progress = unlock.progress;
  const unlocked = unlock.unlocked === true;
  const rows = semestral.rows || [];

  return (
    <AppShell
      role="student"
      profile={profile}
      title="My Grades"
      subtitle="Class record · live Written & Performance; exams unlock on display date, when finished, or when locked."
      studentAccess={{ activated: true, enrolled: true }}
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <div className="portal-panel-head flex items-center gap-3 px-4 py-4 sm:px-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
              <LayoutGrid className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
                Class record · student POV
              </p>
              <h3 className="font-heading text-xl font-bold text-[#3d1212] sm:text-2xl">
                My Grades
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                SY {schoolYear} · your own row only
              </p>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            <EvaluationProgressCard
              title={`Term ${unlockTerm} evaluation required`}
              complete={unlocked}
              totalCompleted={progress?.totalCompleted || 0}
              totalRequired={progress?.totalRequired || 1}
              items={[
                {
                  key: "system",
                  label: "System / portal evaluation",
                  done: progress?.systemDone,
                },
                ...(progress?.teachers || []).map((t) => ({
                  key: t.key,
                  label: `${t.subjectName} — ${t.teacherName || "Teacher"}`,
                  done: t.done,
                })),
              ]}
              ctaHref={unlock.evaluationHref || "/student/evaluation"}
              ctaLabel="Complete evaluation to unlock grades"
              lockedMessage="You cannot view grades until evaluations for this term are complete."
            />

            <p className="rounded-xl border border-[#800000]/08 bg-[#faf7f5]/70 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Section :</span>{" "}
              <span className="font-semibold text-[#3d1212]">{sectionLabel}</span>
            </p>

            {semestral.error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {semestral.error}
              </p>
            ) : null}
          </div>
        </div>

        {unlocked ? (
          <StudentClassRecordSemestralView
            rows={rows}
            emptyMessage="No class record scores yet. Written and Performance appear as your teacher encodes them."
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-[#800000]/20 bg-[#faf7f5] px-5 py-10 text-center text-sm text-muted-foreground">
            Grades stay locked until you finish the required evaluations.
          </div>
        )}
      </div>
    </AppShell>
  );
}
