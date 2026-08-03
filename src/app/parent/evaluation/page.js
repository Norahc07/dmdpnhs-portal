import { AppShell } from "@/components/layout/AppShell";
import { ParentEvaluationTabs } from "@/components/evaluation/ParentEvaluationTabs";
import { requireRole } from "@/lib/auth-guard";
import {
  getEvaluationContext,
  listMyEvaluations,
} from "@/actions/evaluation";
import {
  computeParentTermCompletion,
  currentEvaluationTerm,
} from "@/lib/evaluation";

export const metadata = { title: "Evaluation" };

export default async function ParentEvaluationPage({ searchParams }) {
  const params = await searchParams;
  const { profile } = await requireRole("parent");
  const ctx = await getEvaluationContext();
  const term = Number(params.term) || currentEvaluationTerm();

  if (ctx.error) {
    return (
      <AppShell role="parent" profile={profile} title="Evaluation">
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
  const childExistings = {};
  for (const e of evaluations) {
    if (e.evaluation_type !== "child" || !e.student_id) continue;
    childExistings[e.student_id] = e;
  }

  const progress = computeParentTermCompletion({
    children: ctx.children || [],
    evaluations,
    term,
    schoolYear: ctx.schoolYear,
  });

  return (
    <AppShell
      role="parent"
      profile={profile}
      title="Parent evaluation"
      subtitle={`Rate the portal and each linked child for Term ${term}.`}
    >
      {listed.tableMissing ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 shadow-sm">
          Apply evaluation SQL upgrades in Supabase before submitting.
        </div>
      ) : null}
      <ParentEvaluationTabs
        schoolYear={ctx.schoolYear}
        defaultTerm={term}
        children={ctx.children || []}
        systemExisting={systemExisting}
        childExistings={childExistings}
        progress={progress}
      />
    </AppShell>
  );
}
