import { GraduationCap, KeyRound, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ParentChildProfileCard } from "@/components/parent/ParentChildProfileCard";
import { requireRole } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Parent Dashboard" };

export default async function ParentDashboard() {
  const { profile } = await requireRole("parent");
  const admin = createAdminClient();

  const { data: parent } = await admin
    .from("parents")
    .select("id, access_code")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: links } = await admin
    .from("parent_student_links")
    .select("student_id")
    .eq("parent_id", parent?.id || "00000000-0000-0000-0000-000000000000");

  const studentIds = (links || []).map((l) => l.student_id).filter(Boolean);

  let children = [];
  if (studentIds.length) {
    const { data } = await admin
      .from("students")
      .select(
        `
        id,
        lrn,
        grade_level,
        status,
        activation_status,
        birthdate,
        gender,
        contact_number,
        personal_email,
        address,
        emergency_contact_name,
        emergency_contact_number,
        profiles (
          id,
          first_name,
          middle_name,
          last_name,
          email,
          avatar_url
        ),
        sections (
          section_name,
          grade_level,
          school_year
        )
      `
      )
      .in("id", studentIds)
      .order("grade_level", { ascending: true });

    children = data || [];
  }

  return (
    <AppShell
      role="parent"
      profile={profile}
      title={`Hello, ${profile.first_name}`}
      subtitle="View your child’s profile, grades, and attendance."
    >
      <div className="space-y-5">
        {parent?.access_code ? (
          <section className="portal-overview-banner rounded-2xl">
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000] ring-1 ring-[#800000]/12">
                  <KeyRound className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
                    Parent access code
                  </p>
                  <p className="mt-1 font-(family-name:--font-montserrat) text-2xl font-bold tracking-wide text-[#3d1212]">
                    {parent.access_code}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use this code to sign in. Keep it private.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#800000]/8 px-3 py-1.5 text-xs font-semibold text-[#800000] ring-1 ring-[#800000]/12">
                <Users className="size-3.5" />
                {children.length} linked learner
                {children.length === 1 ? "" : "s"}
              </span>
            </div>
          </section>
        ) : null}

        {children.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#800000]/20 bg-white px-5 py-10 text-center shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
            <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
              <GraduationCap className="size-6" />
            </span>
            <p className="font-heading font-bold text-[#3d1212]">
              No learners linked yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Contact the registrar to link a student to this access code.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {children.map((child) => (
              <ParentChildProfileCard key={child.id} child={child} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
