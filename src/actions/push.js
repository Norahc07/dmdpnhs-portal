"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { vapidConfigured, vapidPublicKey } from "@/lib/web-push";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  return { user };
}

export async function getPushPublicKey() {
  if (!vapidConfigured()) {
    return { enabled: false, publicKey: "" };
  }
  return { enabled: true, publicKey: vapidPublicKey() };
}

export async function savePushSubscription(subscription) {
  const auth = await requireUser();
  if (auth.error) return auth;

  const endpoint = String(subscription?.endpoint || "").trim();
  const p256dh = String(subscription?.keys?.p256dh || "").trim();
  const authKey = String(subscription?.keys?.auth || "").trim();
  if (!endpoint || !p256dh || !authKey) {
    return { error: "Invalid push subscription." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      profile_id: auth.user.id,
      endpoint,
      p256dh,
      auth: authKey,
      user_agent: String(subscription?.userAgent || "").slice(0, 300) || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deletePushSubscription(endpoint) {
  const auth = await requireUser();
  if (auth.error) return auth;

  const value = String(endpoint || "").trim();
  if (!value) return { error: "Missing subscription." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("profile_id", auth.user.id)
    .eq("endpoint", value);
  if (error) return { error: error.message };
  return { ok: true };
}
