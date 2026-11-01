import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PendingActivationsTable } from "@/components/registrar/PendingActivationsTable";
import { requireRole } from "@/lib/auth-guard";
import {
  getCachedRegistrarSections,
  getCachedRegistrarStudents,
} from "@/lib/cache/registrar-data";

export const metadata = { title: "Student Activations" };

function isAwaitingActivation(student) {
  const status = String(student?.activation_status || "")
    .trim()
    .toLowerCase();
  return status === "pending" || status === "incomplete" || !status;
}

function isActivated(student) {
  return String(student?.activation_status || "").trim().toLowerCase() === "active";
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
  return (students || []).map((stu) => ({
    ...stu,
    parent_name: stu.emergency_contact_name || "",
    parent_phone: stu.emergency_contact_number || "",
    parent_email: "",
    parent_access_code_shown: "",
  }));
}

function ActivationsTableFallback() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
      Loading activations…
    </div>
  );
}

async function ActivationsBody() {
  const [{ rows: studentsRaw, error: loadError }, { rows: sections }] =
    await Promise.all([
      getCachedRegistrarStudents(),
      getCachedRegistrarSections(),
    ]);

  const students = attachSections(studentsRaw, sections);
  const pendingRows = withEmergencyContact(students.filter(isAwaitingActivation));
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
      subtitle="Newly enrolled or registered learners stay here until they submit personal and emergency contact details and you Verify & Approve."
    >
      <Suspense fallback={<ActivationsTableFallback />}>
        <ActivationsBody />
      </Suspense>
    </AppShell>
  );
}
