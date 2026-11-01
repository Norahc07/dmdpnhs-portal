import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PendingActivationsTable } from "@/components/registrar/PendingActivationsTable";
import { syncIncompleteActivationsWithContacts } from "@/actions/activation";
import { requireRole } from "@/lib/auth-guard";
import { resolveActivationStatus } from "@/lib/activation-status";
import {
  getCachedRegistrarSections,
  getCachedRegistrarStudents,
} from "@/lib/cache/registrar-data";

export const metadata = { title: "Student Activations" };

function isAwaitingActivation(student) {
  const status = resolveActivationStatus(student);
  return status === "pending" || status === "incomplete";
}

function isActivated(student) {
  return resolveActivationStatus(student) === "active";
}

function attachSections(students, sections) {
  const byId = new Map((sections || []).map((s) => [s.id, s]));
  return (students || []).map((row) => ({
    ...row,
    sections:
      row.sections ||
      (row.section_id ? byId.get(row.section_id) || null : null),
  }));
}

function withEmergencyContact(students) {
  return (students || []).map((stu) => {
    const mapped = {
      ...stu,
      parent_name: stu.emergency_contact_name || "",
      parent_phone: stu.emergency_contact_number || "",
      parent_email: "",
      parent_access_code_shown: "",
    };
    return {
      ...mapped,
      activation_status: resolveActivationStatus(mapped),
    };
  });
}

function ActivationsTableFallback() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
      Loading activations…
    </div>
  );
}

async function ActivationsBody() {
  // Persist incomplete → pending when guardian contacts already exist.
  await syncIncompleteActivationsWithContacts();

  const [{ rows: studentsRaw, error: loadError }, { rows: sections }] =
    await Promise.all([
      getCachedRegistrarStudents(),
      getCachedRegistrarSections(),
    ]);

  const students = attachSections(studentsRaw, sections);
  const pendingRows = withEmergencyContact(
    students.filter(isAwaitingActivation)
  );
  const activatedRows = withEmergencyContact(students.filter(isActivated));

  return (
    <PendingActivationsTable
      pendingRows={pendingRows}
      activatedRows={activatedRows}
      sections={sections}
      loadError={
        loadError && !students.length
          ? `Could not load activations: ${loadError}`
          : ""
      }
    />
  );
}

export default async function RegistrarActivationsPage() {
  const { profile } = await requireRole("registrar");

  return (
    <AppShell
      role="registrar"
      profile={profile}
      title="Student activations"
      subtitle="Incomplete = missing parent contacts. Pending = details on file — call to verify, then Approve."
    >
      <Suspense fallback={<ActivationsTableFallback />}>
        <ActivationsBody />
      </Suspense>
    </AppShell>
  );
}
