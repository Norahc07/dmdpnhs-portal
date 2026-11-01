import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { EnrollmentTable } from "@/components/registrar/EnrollmentTable";
import { requireRole } from "@/lib/auth-guard";
import {
  getCachedRegistrarSections,
  getCachedRegistrarStudents,
} from "@/lib/cache/registrar-data";

export const metadata = { title: "Enrollment" };

function EnrollmentTableFallback() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
      Loading enrollment…
    </div>
  );
}

async function EnrollmentBody() {
  const [{ rows: students, error }, { rows: sections }] = await Promise.all([
    getCachedRegistrarStudents(),
    getCachedRegistrarSections(),
  ]);

  return (
    <EnrollmentTable
      students={students}
      sections={sections}
      loadError={
        error && !students.length
          ? `Could not load enrollment: ${error}`
          : ""
      }
    />
  );
}

export default async function RegistrarEnrollmentPage() {
  const { profile } = await requireRole("registrar");

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="School year enrollment"
      subtitle="All enrolled learners for the school year. Add a new learner here; they stay in Activations until details are submitted and you verify the account."
    >
      <Suspense fallback={<EnrollmentTableFallback />}>
        <EnrollmentBody />
      </Suspense>
    </AppShell>
  );
}
