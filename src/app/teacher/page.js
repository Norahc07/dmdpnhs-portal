import Link from "next/link";
import { BookOpen, ClipboardList, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TeacherProfileBanner } from "@/components/teacher/TeacherDashboard";
import { requireRole } from "@/lib/auth-guard";
import { getTeacherAccess } from "@/lib/teacher-access";

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
          <section className="rounded-2xl border border-[#800000]/10 bg-white p-5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#800000]/8 text-[#800000]">
                <Users className="size-4" />
              </span>
              <h3 className="font-heading text-base font-bold text-[#3d1212]">
                Advisory sections
              </h3>
            </div>
            <div className="space-y-1.5 text-sm">
              {(sections || []).length === 0 && (
                <p className="text-muted-foreground">
                  No advisory section assigned.
                </p>
              )}
              {(sections || []).map((s) => (
                <p
                  key={s.id}
                  className="rounded-lg border border-[#800000]/08 bg-[#faf7f5] px-3 py-2 text-[#3d1212]"
                >
                  G{s.grade_level} · {s.section_name}
                </p>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#800000]/10 bg-white p-5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#800000]/8 text-[#800000]">
                <BookOpen className="size-4" />
              </span>
              <h3 className="font-heading text-base font-bold text-[#3d1212]">
                Assigned classes
              </h3>
            </div>
            <div className="space-y-1.5 text-sm">
              {(assignments || []).length === 0 && (
                <p className="text-muted-foreground">
                  No subject assignments yet.
                </p>
              )}
              {(assignments || []).slice(0, 6).map((a) => (
                <p
                  key={a.id}
                  className="rounded-lg border border-[#800000]/08 bg-[#faf7f5] px-3 py-2 text-[#3d1212]"
                >
                  G{a.sections?.grade_level} {a.sections?.section_name} ·{" "}
                  {a.subjects?.subject_name}
                </p>
              ))}
              <Link
                className="mt-2 inline-flex text-sm font-medium text-[#800000] underline-offset-2 hover:underline"
                href="/teacher/students"
              >
                View enrolled students
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-[#800000]/10 bg-white p-5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#800000]/8 text-[#800000]">
                <ClipboardList className="size-4" />
              </span>
              <h3 className="font-heading text-base font-bold text-[#3d1212]">
                Quick tools
              </h3>
            </div>
            <div className="space-y-2 text-sm">
              <Link
                className="flex items-center justify-between rounded-lg border border-[#800000]/08 bg-[#faf7f5] px-3 py-2.5 font-medium text-[#3d1212] transition hover:border-[#800000]/20 hover:bg-white"
                href="/teacher/gradebook"
              >
                Interactive gradebook
                <span className="text-[#800000]">→</span>
              </Link>
              <Link
                className="flex items-center justify-between rounded-lg border border-[#800000]/08 bg-[#faf7f5] px-3 py-2.5 font-medium text-[#3d1212] transition hover:border-[#800000]/20 hover:bg-white"
                href="/teacher/attendance"
              >
                Smart attendance
                <span className="text-[#800000]">→</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
