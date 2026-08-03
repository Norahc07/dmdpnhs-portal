import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Opaque URL tokens (AES-256-GCM) so resource IDs are not exposed in the path.
 * Prefer PORTAL_TOKEN_SECRET; falls back to hashing the service role key.
 */

function getKey() {
  const secret =
    process.env.PORTAL_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "pastraportal-dev-token-secret";
  return createHash("sha256").update(String(secret)).digest();
}

function toBase64Url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(str) {
  const padded = String(str || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

/**
 * Seal a JSON-serializable payload into a URL-safe token.
 */
export function sealToken(payload) {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return toBase64Url(Buffer.concat([iv, tag, encrypted]));
}

/**
 * Unseal a token. Returns null if tampered, expired, or invalid.
 */
export function unsealToken(token, { maxAgeMs = 7 * 24 * 60 * 60 * 1000 } = {}) {
  try {
    const raw = fromBase64Url(token);
    if (raw.length < 12 + 16 + 1) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const key = getKey();
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    const payload = JSON.parse(plaintext.toString("utf8"));
    if (!payload || typeof payload !== "object") return null;
    if (payload.iat && maxAgeMs > 0) {
      const age = Date.now() - Number(payload.iat);
      if (!Number.isFinite(age) || age < 0 || age > maxAgeMs) return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/** Teacher section roster token — binds section to the signed-in teacher. */
export function sealTeacherSectionToken(sectionId, teacherId) {
  if (!sectionId || !teacherId) return "";
  return sealToken({
    v: 1,
    kind: "teacher_section",
    sid: String(sectionId),
    tid: String(teacherId),
    iat: Date.now(),
  });
}

export function unsealTeacherSectionToken(token, teacherId) {
  const payload = unsealToken(token);
  if (!payload) return null;
  if (payload.kind !== "teacher_section") return null;
  if (!payload.sid || !payload.tid) return null;
  if (String(payload.tid) !== String(teacherId)) return null;
  return String(payload.sid);
}
