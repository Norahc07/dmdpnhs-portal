import Link from "next/link";
import { ClipboardList, History, Lock, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { requireSecretaryWorkspace } from "@/lib/auth-guard";

export const metadata = { title: "Class secretary" };

export default async function ClassSecretaryHomePage() {
  const { profile, studentAccess, section } = await requireSecretaryWorkspace();
  const sectionLabel = `Grade ${section.grade_level} · ${section.section_name}`;

  return (
    <AppShell
      role="student"
      profile={profile}
      title="Class secretary"
      subtitle={`${sectionLabel} · attendance access only.`}
      studentAccess={studentAccess}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[#ffd700]/40 bg-[#ffd700]/15 px-4 py-3 text-sm text-[#3d1212]">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4" />
            Separate class secretary access
          </p>
          <p className="mt-1 text-[#3d1212]/80">
            Your adviser appointed you for this section. You may record, update,
            and review attendance here. You cannot encode grades, edit academic
            records, open other sections, or use administrative tools.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/student/class-attendance"
            className="rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] transition hover:border-[#800000]/25"
          >
            <ClipboardList className="size-5 text-[#800000]" />
            <p className="mt-2 font-heading font-bold text-[#3d1212]">
              Record attendance
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Mark Present, Late, Absent, or Excused for {sectionLabel}.
            </p>
          </Link>
          <Link
            href="/student/class-attendance/history"
            className="rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] transition hover:border-[#800000]/25"
          >
            <History className="size-5 text-[#800000]" />
            <p className="mt-2 font-heading font-bold text-[#3d1212]">
              Attendance history
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Review earlier marks for this section, then update if needed.
            </p>
          </Link>
        </div>

        <div className="rounded-2xl border border-[#800000]/10 bg-white px-4 py-3 text-sm text-[#3d1212]">
          <p className="flex items-center gap-2 font-semibold">
            <Lock className="size-4 text-[#800000]" />
            Not included in this access
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Encoding grades or editing academic records</li>
            <li>Attendance for any section other than {section.section_name}</li>
            <li>Registrar, faculty, or other administrative functions</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
