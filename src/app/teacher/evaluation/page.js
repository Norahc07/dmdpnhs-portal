import { AppShell } from "@/components/layout/AppShell";
import { TeacherReceivedEvaluations } from "@/components/evaluation/TeacherReceivedEvaluations";
import { listTeacherReceivedEvaluations } from "@/actions/evaluation";
import { requireRole } from "@/lib/auth-guard";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import { currentEvaluationTerm } from "@/lib/evaluation";
import { normalizeGradeTerm } from "@/lib/grades-terms";
import { getTeacherAccess } from "@/lib/teacher-access";

export const metadata = { title: "Student evaluations" };

export default async function TeacherEvaluationPage({ searchParams }) {
  const query = await searchParams;
  const { profile, supabase } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);
  const term = normalizeGradeTerm(query?.term || currentEvaluationTerm());

  const result = await listTeacherReceivedEvaluations({
    schoolYear: SCHOOL_YEAR_DEFAULT,
    term,
  });

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
      title="Student evaluations"
      subtitle="Anonymous ratings students submit about your teaching before they can view term grades."
    >
      {result.tableMissing ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Apply evaluation SQL upgrades in Supabase to view student ratings.
        </div>
      ) : result.error ? (
        <p className="text-sm text-rose-700">{result.error}</p>
      ) : (
        <TeacherReceivedEvaluations
          schoolYear={result.schoolYear || SCHOOL_YEAR_DEFAULT}
          term={term}
          summary={result.summary}
          rows={result.rows || []}
        />
      )}
    </AppShell>
  );
}
