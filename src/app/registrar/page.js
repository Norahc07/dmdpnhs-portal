import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { RegistrarAnalytics } from "@/components/registrar/RegistrarAnalytics";
import { requireRole } from "@/lib/auth-guard";
import { fetchRegistrarAnalytics } from "@/lib/registrar-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Registrar Dashboard" };

export default async function RegistrarDashboard() {
  const { supabase, profile } = await requireRole("registrar");

  const [
    analytics,
    { count: pendingTeachers },
    { count: pendingActivations },
    { count: pendingDocs },
  ] = await Promise.all([
    fetchRegistrarAnalytics(supabase),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "teacher")
      .eq("status", "pending"),
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("activation_status", "pending"),
    supabase
      .from("document_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "Pending"),
  ]);

  const current = analytics.byYear[analytics.defaultYear] || {
    enrolled: 0,
    male: 0,
    female: 0,
  };

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Registrar Control Center"
      subtitle="Operational queues plus school-year analytics for enrollment, faculty, and grades."
    >
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Enrolled · SY {analytics.defaultYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-[#800000]">
              {current.enrolled || 0}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              M {current.male || 0} · F {current.female || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending activations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-[#800000]">
              {pendingActivations || 0}
            </p>
            <Link
              href="/registrar/activations"
              className="text-xs text-[#800000] underline"
            >
              Review students
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending faculty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-[#800000]">
              {pendingTeachers || 0}
            </p>
            <Link
              href="/registrar/teachers"
              className="text-xs text-[#800000] underline"
            >
              Review approvals
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Doc requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-[#800000]">
              {pendingDocs || 0}
            </p>
            <Link
              href="/registrar/requests"
              className="text-xs text-[#800000] underline"
            >
              Manage pipeline
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Locked gradebooks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-[#800000]">
              {current.lockedRecords || 0}
            </p>
            <Link
              href="/registrar/grades"
              className="text-xs text-[#800000] underline"
            >
              Grade lock queue
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <RegistrarAnalytics analytics={analytics} />
      </div>
    </AppShell>
  );
}
