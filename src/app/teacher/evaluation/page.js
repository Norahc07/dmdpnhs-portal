import { AppShell } from "@/components/layout/AppShell";
import { TeacherEvaluationTabs } from "@/components/evaluation/TeacherEvaluationTabs";
import { requireRole } from "@/lib/auth-guard";
import {
  getEvaluationContext,
  listMyEvaluations,
} from "@/actions/evaluation";
import {
  TEACHER_YEAR_END_TERM,
  computeTeacherStudentProgress,
  computeTeacherYearCompletion,
} from "@/lib/evaluation";
import { getTeacherAccess } from "@/lib/teacher-access";

export const metadata = { title: "Evaluation" };

export default async function TeacherEvaluationPage() {
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);
  const ctx = await getEvaluationContext();

  if (ctx.error) {
    return (
      <AppShell
        role="teacher"
        profile={profile}
        teacherAccess={teacherAccess}
        title="Evaluation"
      >
        <p className="text-sm text-muted-foreground">{ctx.error}</p>
      </AppShell>
    );
  }

  const listed = await listMyEvaluations({
    schoolYear: ctx.schoolYear,
    term: TEACHER_YEAR_END_TERM,
  });

  const evaluations = listed.evaluations || [];
  const systemExisting =
    evaluations.find((e) => e.evaluation_type === "system") || null;
  const sectionExistings = {};
  const studentExistings = {};
  for (const e of evaluations) {
    if (e.evaluation_type === "section" && e.target_section_id) {
      sectionExistings[e.target_section_id] = e;
    }
    if (e.evaluation_type === "student" && e.student_id) {
      studentExistings[e.student_id] = e;
    }
  }

  const progress = computeTeacherYearCompletion({
    sections: ctx.sections || [],
    evaluations,
    schoolYear: ctx.schoolYear,
  });
  const studentProgress = computeTeacherStudentProgress({
    learners: ctx.learners || [],
    evaluations,
    schoolYear: ctx.schoolYear,
  });

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
        title="Evaluation"
      subtitle={`SY ${ctx.schoolYear}: rate the system, then each grade · section you handle.`}
    >
      {listed.tableMissing ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 shadow-sm">
          Apply evaluation SQL upgrades in Supabase before submitting.
        </div>
      ) : null}
      <TeacherEvaluationTabs
        schoolYear={ctx.schoolYear}
        sections={ctx.sections || []}
        systemExisting={systemExisting}
        sectionExistings={sectionExistings}
        progress={progress}
        learners={ctx.learners || []}
        studentExistings={studentExistings}
        studentProgress={studentProgress}
      />
    </AppShell>
  );
}
