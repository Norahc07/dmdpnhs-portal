import { AppShell } from "@/components/layout/AppShell";
import { AnalyticsCharts } from "@/components/registrar/AnalyticsCharts";
import { StatCards } from "@/components/registrar/StatCards";
import { requireRole } from "@/lib/auth-guard";
import { getRegistrarDashboardAnalytics } from "@/actions/analytics";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";

export const metadata = { title: "Registrar Dashboard" };

export default async function RegistrarDashboard() {
  const { profile } = await requireRole("registrar");
  const dashboard = await getRegistrarDashboardAnalytics(SCHOOL_YEAR_DEFAULT);
  const schoolYear = dashboard.schoolYear || SCHOOL_YEAR_DEFAULT;
  const kpis = dashboard.kpis || {};

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Registrar Control Center"
      subtitle="Compact enrollment metrics and analytical charts for operations planning."
    >
      <div className="space-y-6">
        {dashboard.isSample ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Some enrollment / chart series still use preview fill-ins where live
            grade or EOSY rows are sparse. Ops queues (faculty, activations,
            locked gradebooks) use real database rows shared with their pages.
          </p>
        ) : null}

        <StatCards
          kpis={kpis}
          schoolYear={schoolYear}
          pendingActivations={kpis.pendingActivations || 0}
          lockedGrades={kpis.lockedGradebooks || 0}
          isSample={Boolean(dashboard.isSample)}
        />
        <AnalyticsCharts charts={dashboard.charts} />
      </div>
    </AppShell>
  );
}
