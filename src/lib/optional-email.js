export function isNoneFlag(value) {
  return ["1", "true", "on", "yes"].includes(
    String(value || "")
      .trim()
      .toLowerCase()
  );
}

/** Returns a stored email, or null when the user chose None / left it blank. */
export function parseOptionalEmail({ email, none } = {}) {
  if (isNoneFlag(none)) return null;
  const value = String(email || "")
    .trim()
    .toLowerCase();
  return value || null;
}
