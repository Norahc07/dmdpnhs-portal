export const REQUIRED_DOCUMENTS = [
  {
    key: "psa_birth_cert",
    label: "PSA Birth Certificate",
    description: "Clear copy of the learner’s PSA birth certificate.",
    required: true,
  },
  {
    key: "report_card",
    label: "Latest Report Card (SF9)",
    description: "Most recent report card from the previous grade or school.",
    required: true,
  },
  {
    key: "id_photo",
    label: "2×2 ID photo",
    description: "Recent photo, white or school-appropriate background.",
    required: true,
  },
  {
    key: "parent_id",
    label: "Parent / guardian ID",
    description: "Valid government or school ID of the parent or guardian.",
    required: true,
  },
  {
    key: "sf10",
    label: "Permanent Record (SF10)",
    description: "Required for transferees. Optional if you started at DMDPNHS.",
    required: false,
  },
  {
    key: "good_moral",
    label: "Certificate of Good Moral",
    description: "Required for transferees. Optional if you started at DMDPNHS.",
    required: false,
  },
];

export const DOCUMENT_SUBMISSION_STATUSES = [
  "not_submitted",
  "submitted",
  "under_review",
  "approved",
  "needs_revision",
];

export const DOCUMENT_SUBMISSION_STATUS_META = {
  not_submitted: {
    label: "Not Submitted",
    hint: "No file uploaded yet",
  },
  submitted: {
    label: "Submitted",
    hint: "Waiting for review",
  },
  under_review: {
    label: "Under Review",
    hint: "Registrar or teacher is checking this file",
  },
  approved: {
    label: "Approved",
    hint: "Accepted for school records",
  },
  needs_revision: {
    label: "Needs Revision",
    hint: "Upload a clearer or corrected file",
  },
};

export const DOCUMENT_SQL_HINT =
  "Required documents are not enabled yet. Apply supabase/student-documents.sql in the Supabase SQL editor.";

export function isStudentDocumentsTableMissing(error) {
  const message = String(error?.message || error || "");
  return (
    /student_documents/i.test(message) &&
    /does not exist|schema cache|could not find/i.test(message)
  );
}

export function documentStatusLabel(status) {
  return DOCUMENT_SUBMISSION_STATUS_META[status]?.label || "Not Submitted";
}

export function requiredDocumentByKey(key) {
  return REQUIRED_DOCUMENTS.find((item) => item.key === key) || null;
}

export function learnerDisplayName(profile) {
  const last = profile?.last_name || "";
  const first = profile?.first_name || "";
  if (!last && !first) return "Learner";
  return last ? `${last}, ${first}` : first;
}

export function canStudentReplaceDocument(status) {
  return (
    !status ||
    status === "not_submitted" ||
    status === "needs_revision" ||
    status === "submitted"
  );
}
