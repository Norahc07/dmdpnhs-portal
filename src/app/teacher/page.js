import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TeacherProfileBanner } from "@/components/teacher/TeacherDashboard";
import { requireRole } from "@/lib/auth-guard";
import { getTeacherAccess } from "@/lib/teacher-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Teacher Dashboard" };

export default async function TeacherDashboard() {
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);

  const { data: teacher } = await supabase
    .from("teachers")
    .select("*")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: sections } = await supabase
    .from("sections")
    .select("*")
    .eq("adviser_id", teacher?.id || "00000000-0000-0000-0000-000000000000");

  const { data: assignments } = await supabase
    .from("teacher_assignments")
    .select(
      "id, sections(section_name, grade_level), subjects(subject_name), school_year"
    )
    .eq("teacher_id", teacher?.id || "00000000-0000-0000-0000-000000000000");

  return (
    <AppShell role="teacher" profile={profile} teacherAccess={teacherAccess}>
      <div className="space-y-5">
        <TeacherProfileBanner
          profile={profile}
          teacher={teacher}
          advisorySections={sections || []}
          assignmentCount={(assignments || []).length}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Advisory sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {(sections || []).length === 0 && (
                <p className="text-muted-foreground">
                  No advisory section assigned.
                </p>
              )}
              {(sections || []).map((s) => (
                <p key={s.id}>
                  G{s.grade_level} - {s.section_name}
                </p>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned classes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {(assignments || []).length === 0 && (
                <p className="text-muted-foreground">
                  No subject assignments yet.
                </p>
              )}
              {(assignments || []).map((a) => (
                <p key={a.id}>
                  G{a.sections?.grade_level} {a.sections?.section_name} ·{" "}
                  {a.subjects?.subject_name}
                </p>
              ))}
              <Link
                className="mt-2 inline-block text-[#800000] underline"
                href="/teacher/students"
              >
                View enrolled students
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link
                className="block text-[#800000] underline"
                href="/teacher/gradebook"
              >
                Interactive gradebook
              </Link>
              <Link
                className="block text-[#800000] underline"
                href="/teacher/attendance"
              >
                Smart attendance
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
