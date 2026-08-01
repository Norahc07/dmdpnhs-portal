import { AppShell } from "@/components/layout/AppShell";
import { PromotionPanel } from "@/components/registrar/PromotionPanel";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "Students" };

export default async function RegistrarStudentsPage() {
  const { supabase, profile } = await requireRole("registrar");

  const { data: students } = await supabase
    .from("students")
    .select("*, profiles(first_name, last_name), sections(section_name, grade_level)")
    .order("grade_level");

  const { data: sections } = await supabase
    .from("sections")
    .select("*")
    .order("grade_level");

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Promotion & Section Transfer"
      subtitle="Batch promote learners (e.g. Grade 7 → 8) or transfer sections."
    >
      <PromotionPanel students={students || []} sections={sections || []} />
    </AppShell>
  );
}
