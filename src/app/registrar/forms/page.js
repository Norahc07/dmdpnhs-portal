import { AppShell } from "@/components/layout/AppShell";
import { SchoolFormsExport } from "@/components/registrar/SchoolFormsExport";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "School Forms" };

export default async function RegistrarFormsPage() {
  const { supabase, profile } = await requireRole("registrar");

  const { data: students } = await supabase
    .from("students")
    .select("*, profiles(first_name, last_name), sections(section_name, grade_level)");

  const { data: sections } = await supabase
    .from("sections")
    .select("*")
    .order("grade_level");

  const { data: attendance } = await supabase
    .from("attendance")
    .select("*")
    .order("date", { ascending: false })
    .limit(5000);

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="DepEd School Forms"
      subtitle="Export LIS-compliant CSV for SF1, SF2, and SF5."
    >
      <SchoolFormsExport
        students={students || []}
        sections={sections || []}
        attendance={attendance || []}
      />
    </AppShell>
  );
}
