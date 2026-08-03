import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth-guard";
import { getEvaluationSummary } from "@/actions/evaluation";
import { currentEvaluationTerm } from "@/lib/evaluation";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Evaluation summary" };

function Stat({ label, count, average }) {
  return (
    <div className="rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <p className="text-xs font-semibold tracking-wide text-[#800000] uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-[#3d1212]">
        {count}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {average != null ? `Avg ${average} / 5` : "No scores yet"}
      </p>
    </div>
  );
}

export default async function RegistrarEvaluationPage() {
  const { profile } = await requireRole("registrar");
  const term = currentEvaluationTerm();
  const result = await getEvaluationSummary({
    schoolYear: SCHOOL_YEAR_DEFAULT,
    term,
  });

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Evaluation summary"
      subtitle={`Read-only overview · Term ${term} · SY ${SCHOOL_YEAR_DEFAULT}`}
    >
      {result.tableMissing ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Apply evaluation SQL upgrades in Supabase to enable summaries.
        </div>
      ) : result.error ? (
        <p className="text-sm text-rose-700">{result.error}</p>
      ) : (
        <div className="space-y-4">
          <Badge
            variant="outline"
            className="border-[#800000]/20 bg-[#800000]/5 text-[#800000]"
          >
            {result.summary?.total || 0} responses this term
          </Badge>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              label="Student → System"
              count={result.summary?.studentSystem.count || 0}
              average={result.summary?.studentSystem.average}
            />
            <Stat
              label="Student → Teachers"
              count={result.summary?.studentTeacher.count || 0}
              average={result.summary?.studentTeacher.average}
            />
            <Stat
              label="Teacher → System"
              count={result.summary?.teacherSystem.count || 0}
              average={result.summary?.teacherSystem.average}
            />
            <Stat
              label="Teacher → Sections"
              count={result.summary?.teacherSection?.count || 0}
              average={result.summary?.teacherSection?.average}
            />
            <Stat
              label="Parent → System"
              count={result.summary?.parentSystem.count || 0}
              average={result.summary?.parentSystem.average}
            />
            <Stat
              label="Parent → Child"
              count={result.summary?.parentChild?.count || 0}
              average={result.summary?.parentChild?.average}
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}
