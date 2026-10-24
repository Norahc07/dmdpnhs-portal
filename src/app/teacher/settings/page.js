import Link from "next/link";
import { KeyRound, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth-guard";
import { getTeacherAccess } from "@/lib/teacher-access";

export const metadata = { title: "Account Settings" };

export default async function TeacherSettingsPage() {
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);
  const { data: teacher } = await supabase
    .from("teachers")
    .select("teacher_id, faculty_dept, faculty_position, contact_number")
    .eq("profile_id", profile.id)
    .maybeSingle();

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
      title="Account Settings"
      subtitle="Review how you sign in and jump to profile or password updates."
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-[#800000]/10 bg-white p-5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
            Sign-in details
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#800000]/08 bg-[#faf7f5] px-3 py-3">
              <dt className="text-[11px] font-medium tracking-wide text-[#800000]/75 uppercase">
                Teacher ID
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#3d1212]">
                {teacher?.teacher_id || "—"}
              </dd>
            </div>
            <div className="rounded-xl border border-[#800000]/08 bg-[#faf7f5] px-3 py-3">
              <dt className="text-[11px] font-medium tracking-wide text-[#800000]/75 uppercase">
                Email
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#3d1212]">
                {profile.email || "—"}
              </dd>
            </div>
            <div className="rounded-xl border border-[#800000]/08 bg-[#faf7f5] px-3 py-3">
              <dt className="text-[11px] font-medium tracking-wide text-[#800000]/75 uppercase">
                Department
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#3d1212]">
                {teacher?.faculty_dept || "Faculty"}
              </dd>
            </div>
            <div className="rounded-xl border border-[#800000]/08 bg-[#faf7f5] px-3 py-3">
              <dt className="text-[11px] font-medium tracking-wide text-[#800000]/75 uppercase">
                Position
              </dt>
              <dd className="mt-1 text-sm font-semibold capitalize text-[#3d1212]">
                {(teacher?.faculty_position || "teacher").replaceAll("_", " ")}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Sign in with your faculty email or Teacher ID. Update personal details
            in Profile. Change your password on its own page.
          </p>
        </section>

        <section className="space-y-3">
          <Link
            href="/teacher/profile"
            className="flex items-start gap-3 rounded-2xl border border-[#800000]/10 bg-white p-4 transition hover:border-[#800000]/25"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
              <UserRound className="size-5" />
            </span>
            <div>
              <p className="font-heading font-bold text-[#3d1212]">Profile</p>
              <p className="text-xs text-muted-foreground">
                Photo, name, and contact details.
              </p>
            </div>
          </Link>
          <Link
            href="/teacher/password"
            className="flex items-start gap-3 rounded-2xl border border-[#800000]/10 bg-white p-4 transition hover:border-[#800000]/25"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
              <KeyRound className="size-5" />
            </span>
            <div>
              <p className="font-heading font-bold text-[#3d1212]">
                Change Password
              </p>
              <p className="text-xs text-muted-foreground">
                Replace the password for your email or Teacher ID.
              </p>
            </div>
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
