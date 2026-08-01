import { PublicShell } from "@/components/landing/PublicShell";
import { ComingSoonPanel } from "@/components/landing/ComingSoonPanel";

export const metadata = { title: "Admission" };

export default function AdmissionPage() {
  return (
    <PublicShell>
      <section className="px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-sans text-xs font-semibold tracking-[0.22em] text-[#800000] uppercase">
            Admission
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-[#3d1212] sm:text-4xl">
            Online admission
          </h1>
          <p className="mx-auto mt-3 max-w-xl font-sans text-sm text-neutral-600 sm:text-base">
            Digital enrollment and application tools are on the way.
          </p>
        </div>
        <div className="mt-10">
          <ComingSoonPanel
            title="Admission portal coming soon"
            description="Online admission forms, requirement checklists, and enrollment status tracking will be available here. For now, please visit the school registrar for enrollment assistance."
          />
        </div>
      </section>
    </PublicShell>
  );
}
