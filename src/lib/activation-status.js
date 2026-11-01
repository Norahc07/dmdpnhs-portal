/** Shared activation readiness helpers for registrar + UI. */

export function normalizePhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export function hasGuardianDetailsReady(studentOrPatch) {
  const name = String(
    studentOrPatch?.emergency_contact_name ||
      studentOrPatch?.parent_name ||
      ""
  ).trim();
  const phone = normalizePhoneDigits(
    studentOrPatch?.emergency_contact_number ||
      studentOrPatch?.parent_phone ||
      ""
  );
  return Boolean(name) && phone.length >= 10;
}

/**
 * Display / workflow status:
 * incomplete + guardian contacts on file → pending (ready to Verify & Approve)
 */
export function resolveActivationStatus(student) {
  const raw = String(student?.activation_status || "")
    .trim()
    .toLowerCase();
  if (!raw) return "incomplete";
  if (raw === "incomplete" && hasGuardianDetailsReady(student)) {
    return "pending";
  }
  return raw;
}

export function isReadyForRegistrarApproval(student) {
  const status = resolveActivationStatus(student);
  return status === "pending";
}
