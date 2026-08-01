import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Parent Dashboard" };

export default async function ParentDashboard() {
  const { supabase, profile } = await requireRole("parent");

  const { data: parent } = await supabase
    .from("parents")
    .select("id, access_code")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: links } = await supabase
    .from("parent_student_links")
    .select(
      "student_id, students(id, lrn, grade_level, status, profiles(first_name, last_name), sections(section_name))"
    )
    .eq("parent_id", parent?.id || "00000000-0000-0000-0000-000000000000");

  const children = (links || []).map((l) => l.students).filter(Boolean);

  return (
    <AppShell
      role="parent"
      profile={profile}
      title={`Hello, ${profile.first_name}`}
      subtitle="Monitor your child's grades and attendance."
    >
      {parent?.access_code ? (
        <div className="mb-4 rounded-xl border border-[#ffd700]/40 bg-[#ffd700]/10 px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-[#800000] uppercase">
            Your Parent Access Code
          </p>
          <p className="mt-1 font-(family-name:--font-montserrat) text-xl font-bold text-[#3d1212]">
            {parent.access_code}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use this code to sign in. Keep it private.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {children.length === 0 && (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              No learners linked to this access code yet. Please contact the
              registrar.
            </CardContent>
          </Card>
        )}
        {children.map((child) => (
          <Card key={child.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {child.profiles?.last_name}, {child.profiles?.first_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                Grade {child.grade_level} · {child.sections?.section_name || "—"}
              </p>
              <p className="text-muted-foreground">LRN {child.lrn}</p>
              <div className="flex gap-3 pt-2">
                <Link className="text-[#800000] underline" href="/parent/grades">
                  Grades
                </Link>
                <Link
                  className="text-[#800000] underline"
                  href="/parent/attendance"
                >
                  Attendance
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
