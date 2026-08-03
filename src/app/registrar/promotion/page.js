import { Construction } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "Promotion & Re-Enrollment" };

export default async function RegistrarPromotionPage() {
  const { profile } = await requireRole("registrar");

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Promotion & section transfer"
      subtitle="Batch promote eligible learners into next-year sections, stage re-enrollment, then confirm."
    >
      <div
        className="flex min-h-[50vh] items-start justify-center px-4 py-10 sm:py-16"
        role="status"
        aria-live="polite"
      >
        <div className="w-full max-w-md rounded-2xl border border-[#800000]/10 bg-white p-6 text-center shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
            <Construction className="size-6" aria-hidden />
          </div>
          <p className="text-xs font-semibold tracking-wide text-amber-800 uppercase">
            Under maintenance
          </p>
          <h2 className="mt-1 font-heading text-xl font-bold text-[#3d1212]">
            Promotion is temporarily unavailable
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Batch promote, transfer, and confirmation actions are paused until
            maintenance is complete.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
