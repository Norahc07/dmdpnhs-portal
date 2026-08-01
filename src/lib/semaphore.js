import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Send SMS via Semaphore API and log to sms_logs.
 * @param {{ recipient: string, message: string, triggerType?: 'absence'|'grades' }} params
 */
export async function sendSMS({
  recipient,
  message,
  triggerType = "absence",
}) {
  const apiKey = process.env.SEMAPHORE_API_KEY;
  const sender = process.env.SEMAPHORE_SENDER_NAME || "DMDPNHS";
  const phone = String(recipient || "").replace(/\D/g, "");

  if (!phone) {
    return { ok: false, error: "Missing recipient phone number" };
  }

  let status = "failed";
  let error = null;

  if (!apiKey) {
    error = "SEMAPHORE_API_KEY is not configured";
  } else {
    try {
      const body = new URLSearchParams({
        apikey: apiKey,
        number: phone,
        message,
        sendername: sender,
      });

      const res = await fetch("https://api.semaphore.co/api/v4/messages", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (res.ok) {
        status = "sent";
      } else {
        const text = await res.text();
        error = text || `Semaphore HTTP ${res.status}`;
      }
    } catch (err) {
      error = err?.message || "SMS dispatch failed";
    }
  }

  try {
    const admin = createAdminClient();
    await admin.from("sms_logs").insert({
      recipient_phone: phone,
      message_body: message,
      status,
      trigger_type: triggerType,
    });
  } catch {
    // Logging failure should not block caller
  }

  return { ok: status === "sent", status, error };
}
