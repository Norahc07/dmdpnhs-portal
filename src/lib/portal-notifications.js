import { SCHOOL_SHORT } from "@/lib/constants";
import { buildPortalPushPayload, sendWebPushToProfileIds } from "@/lib/web-push";

function snippet(text, max = 160) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

/**
 * Write in-app inbox rows + optional phone/desktop Web Push (with sound).
 * Safe to call from any server action; failures are non-blocking.
 */
export async function notifyProfiles(
  admin,
  profileIds,
  {
    category = "system",
    title,
    body = "",
    href = "/student/notifications",
    meta = {},
    push = true,
    priority = "high",
    tag = null,
  } = {}
) {
  const ids = [...new Set((profileIds || []).filter(Boolean))];
  const cleanTitle = String(title || "").trim();
  if (!ids.length || !cleanTitle) {
    return { inserted: 0, pushed: 0, skipped: true };
  }

  const cleanBody = snippet(body);
  const cleanHref = String(href || "/student/notifications").trim();
  const rows = ids.map((profileId) => ({
    profile_id: profileId,
    category: String(category || "system"),
    title: cleanTitle,
    body: cleanBody || null,
    href: cleanHref,
    meta: meta && typeof meta === "object" ? meta : {},
  }));

  let inserted = 0;
  const { error } = await admin.from("portal_notifications").insert(rows);
  if (error) {
    if (!/portal_notifications|does not exist|schema cache/i.test(error.message || "")) {
      console.error("[portal-notifications] insert", error.message);
    }
  } else {
    inserted = rows.length;
  }

  let pushed = 0;
  if (push) {
    const result = await sendWebPushToProfileIds(
      admin,
      ids,
      buildPortalPushPayload({
        category,
        title: cleanTitle,
        body: cleanBody || `${SCHOOL_SHORT} portal update`,
        href: cleanHref,
        priority,
        tag: tag || `${category}-${Date.now()}`,
      })
    );
    pushed = result?.sent || 0;
  }

  return { inserted, pushed };
}

export async function listPortalNotificationsForProfile(
  admin,
  profileId,
  { limit = 50 } = {}
) {
  if (!profileId) return { items: [], unreadCount: 0, error: null };

  const { data, error } = await admin
    .from("portal_notifications")
    .select("id, category, title, body, href, meta, read_at, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (/portal_notifications|does not exist|schema cache/i.test(error.message || "")) {
      return {
        items: [],
        unreadCount: 0,
        hint: "Apply supabase/portal-notifications.sql in the Supabase SQL editor to enable the notification inbox.",
      };
    }
    return { items: [], unreadCount: 0, error: error.message };
  }

  const items = (data || []).map((row) => ({
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body || "",
    href: row.href || "/student/notifications",
    meta: row.meta || {},
    unread: !row.read_at,
    createdAt: row.created_at,
  }));

  return {
    items,
    unreadCount: items.filter((item) => item.unread).length,
    error: null,
  };
}

export async function markPortalNotificationsRead(admin, profileId, ids = null) {
  if (!profileId) return { error: "Unauthorized" };
  let query = admin
    .from("portal_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .is("read_at", null);
  if (Array.isArray(ids) && ids.length) {
    query = query.in("id", ids);
  }
  const { error } = await query;
  if (error) return { error: error.message };
  return { ok: true };
}
