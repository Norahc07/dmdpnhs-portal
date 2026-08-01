import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Registrar Dashboard" };

export default async function RegistrarDashboard() {
  const { supabase, profile } = await requireRole("registrar");

  const { count: enrolled } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("status", "enrolled");

  const { data: genderRows } = await supabase
    .from("students")
    .select("gender, section_id, sections(section_name, grade_level)")
    .eq("status", "enrolled");

  const { count: pendingTeachers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "teacher")
    .eq("status", "pending");

  const { count: pendingActivations } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("activation_status", "pending");

  const { count: pendingDocs } = await supabase
    .from("document_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "Pending");

  const male = (genderRows || []).filter((s) => s.gender === "Male").length;
  const female = (genderRows || []).filter((s) => s.gender === "Female").length;

  const bySection = {};
  for (const row of genderRows || []) {
    const key = row.sections
      ? `G${row.sections.grade_level} ${row.sections.section_name}`
      : "Unassigned";
    if (!bySection[key]) bySection[key] = { male: 0, female: 0, total: 0 };
    bySection[key].total += 1;
    if (row.gender === "Male") bySection[key].male += 1;
    if (row.gender === "Female") bySection[key].female += 1;
  }

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Registrar Control Center"
      subtitle="Population analytics, faculty approvals, and school forms."
    >
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enrolled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-[#800000]">{enrolled || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Male / Female</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-[#800000]">
              {male} / {female}
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
            <Link href="/registrar/activations" className="text-xs text-[#800000] underline">
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
            <Link href="/registrar/teachers" className="text-xs text-[#800000] underline">
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
            <Link href="/registrar/requests" className="text-xs text-[#800000] underline">
              Manage pipeline
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 rounded-xl border border-[#800000]/10 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-[#3d1212]">
          Gender distribution by section
        </h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(bySection).map(([name, stats]) => (
            <div
              key={name}
              className="rounded-lg border border-[#800000]/8 bg-[#800000]/3 px-3 py-2 text-sm"
            >
              <p className="font-medium">{name}</p>
              <p className="text-muted-foreground">
                Total {stats.total} · M {stats.male} · F {stats.female}
              </p>
            </div>
          ))}
          {Object.keys(bySection).length === 0 && (
            <p className="text-sm text-muted-foreground">No enrolled students yet.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
