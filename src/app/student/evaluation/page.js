import { AppShell } from "@/components/layout/AppShell";
import { StudentEvaluationTabs } from "@/components/evaluation/StudentEvaluationTabs";
import { requireRole } from "@/lib/auth-guard";
import {
  getEvaluationContext,
  listMyEvaluations,
} from "@/actions/evaluation";
import {
  computeStudentTermCompletion,
  currentEvaluationTerm,
} from "@/lib/evaluation";

export const metadata = { title: "Evaluation" };

export default async function StudentEvaluationPage({ searchParams }) {
  const params = await searchParams;
  const { profile } = await requireRole("student");
  const ctx = await getEvaluationContext();
  const term = Number(params.term) || currentEvaluationTerm();

  if (ctx.error) {
    return (
      <AppShell role="student" profile={profile} title="Evaluation">
        <p className="text-sm text-muted-foreground">{ctx.error}</p>
      </AppShell>
    );
  }

  const listed = await listMyEvaluations({
    schoolYear: ctx.schoolYear,
    term,
  });

  const evaluations = listed.evaluations || [];
  const systemExisting =
    evaluations.find((e) => e.evaluation_type === "system") || null;
  const teacherExistings = {};
  for (const e of evaluations) {
    if (e.evaluation_type !== "teacher") continue;
    teacherExistings[`${e.target_teacher_id}::${e.target_subject_id}`] = e;
  }

  const progress = computeStudentTermCompletion({
    teachers: ctx.teachers || [],
    evaluations,
    term,
    schoolYear: ctx.schoolYear,
  });

  return (
    <AppShell
      role="student"
      profile={profile}
      title="Term evaluation"
      subtitle={`LRN ${ctx.lrn || "—"} · Finish system + every subject teacher to unlock Term ${term} grades.`}
      studentAccess={{ activated: true, enrolled: true }}
    >
      {listed.tableMissing ? (
        <div className="mb-4 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm text-amber-950 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.2)]">
          Apply <code className="font-mono text-xs">supabase/evaluations-upgrade.sql</code>{" "}
          and <code className="font-mono text-xs">evaluations-v2-types.sql</code> in
          Supabase.
        </div>
      ) : null}
      <div className="space-y-4">
        <StudentEvaluationTabs
          schoolYear={ctx.schoolYear}
          defaultTerm={term}
          teachers={ctx.teachers || []}
          systemExisting={systemExisting}
          teacherExistings={teacherExistings}
          progress={progress}
        />
      </div>
    </AppShell>
  );
}
