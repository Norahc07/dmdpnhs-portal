import Link from "next/link";
import { KeyRound, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PushNotificationManager } from "@/components/notifications/PushNotificationManager";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "Account Settings" };

export default async function StudentSettingsPage() {
  const { supabase, profile, studentAccess } = await requireRole("student");
  const { data: student } = await supabase
    .from("students")
    .select("lrn, activation_status, status")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const statusLabel = !studentAccess?.activated
    ? "Pending registrar verification"
    : studentAccess?.enrolled
      ? "Officially enrolled"
      : "Activated — awaiting section enrollment";

  return (
    <AppShell
      role="student"
      profile={profile}
      title="Account Settings"
      subtitle="Review how you sign in and jump to profile or password updates."
      studentAccess={studentAccess}
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-[#800000]/10 bg-white p-5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
            Sign-in details
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#800000]/08 bg-[#faf7f5] px-3 py-3">
              <dt className="text-[11px] font-medium tracking-wide text-[#800000]/75 uppercase">
                LRN
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#3d1212]">
                {student?.lrn || "—"}
              </dd>
            </div>
            <div className="rounded-xl border border-[#800000]/08 bg-[#faf7f5] px-3 py-3">
              <dt className="text-[11px] font-medium tracking-wide text-[#800000]/75 uppercase">
                Account status
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#3d1212]">
                {statusLabel}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Sign in with your 12-digit LRN and password. Update personal details
            in Profile. Change your password on its own page.
          </p>
        </section>

        <div className="space-y-3">
        <PushNotificationManager variant="card" />
        <section className="space-y-3">
          <Link
            href="/student/profile"
            className="flex items-start gap-3 rounded-2xl border border-[#800000]/10 bg-white p-4 transition hover:border-[#800000]/25"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
              <UserRound className="size-5" />
            </span>
            <div>
              <p className="font-heading font-bold text-[#3d1212]">Profile</p>
              <p className="text-xs text-muted-foreground">
                Photo, name, address, and guardian contacts.
              </p>
            </div>
          </Link>
          <Link
            href="/student/password"
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
                Replace the password you use with your LRN.
              </p>
            </div>
          </Link>
        </section>
        </div>
      </div>
    </AppShell>
  );
}
