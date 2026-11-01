/** Short-lived middleware gate so we skip profiles/students DB on every hop. */
export const AUTH_GATE_COOKIE = "pp_gate";
export const AUTH_GATE_TTL_MS = 60_000;

/**
 * @returns {{ role: string, status: string, activation: string|null, enrolled: boolean } | null}
 */
export function parseAuthGate(raw, userId) {
  if (!raw || !userId) return null;
  const parts = String(raw).split("|");
  if (parts.length < 7 || parts[0] !== "v1") return null;
  if (parts[1] !== userId) return null;
  const ts = Number(parts[6]);
  if (!Number.isFinite(ts) || Date.now() - ts > AUTH_GATE_TTL_MS) return null;
  return {
    role: parts[2] || "",
    status: parts[3] || "",
    activation: parts[4] || null,
    enrolled: parts[5] === "1",
  };
}

export function serializeAuthGate(userId, gate) {
  return [
    "v1",
    userId,
    gate.role || "",
    gate.status || "",
    gate.activation || "",
    gate.enrolled ? "1" : "0",
    String(Date.now()),
  ].join("|");
}

export const AUTH_GATE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 120,
};
