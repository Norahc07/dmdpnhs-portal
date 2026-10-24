import webpush from "web-push";
import { SCHOOL_SHORT } from "@/lib/constants";

export function vapidPublicKey() {
  return String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
}

export function vapidConfigured() {
  return Boolean(
    vapidPublicKey() && String(process.env.VAPID_PRIVATE_KEY || "").trim()
  );
}

function configureWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:registrar@dmdpnhs.edu.ph",
    vapidPublicKey(),
    String(process.env.VAPID_PRIVATE_KEY || "").trim()
  );
}

function snippet(text, max = 140) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function announcementPushPayload({ id, title, body, postType }) {
  const kind =
    postType === "reminder"
      ? "Reminder"
      : postType === "assignment"
        ? "Assignment"
        : postType === "update"
          ? "Important update"
          : "Announcement";
  return {
    title: `${kind} · ${SCHOOL_SHORT}`,
    body: snippet(title) || snippet(body) || "A new post was published for your section.",
    url: `/student/announcements/${id}`,
    tag: `announcement-${id}`,
  };
}

export async function sendWebPushToProfileIds(admin, profileIds, payload) {
  const ids = [...new Set((profileIds || []).filter(Boolean))];
  if (!ids.length || !vapidConfigured()) return { sent: 0, skipped: true };

  configureWebPush();

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("profile_id", ids);

  if (error) {
    console.error("[web-push] load subscriptions", error.message);
    return { sent: 0, error: error.message };
  }

  const message = JSON.stringify(payload);
  let sent = 0;
  const stale = [];

  await Promise.all(
    (subs || []).map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          message,
          { TTL: 60 * 60 * 12, urgency: "high" }
        );
        sent += 1;
      } catch (err) {
        const status = err?.statusCode || err?.status;
        if (status === 404 || status === 410) {
          stale.push(row.id);
        } else {
          console.error("[web-push] send", err?.message || err);
        }
      }
    })
  );

  if (stale.length) {
    await admin.from("push_subscriptions").delete().in("id", stale);
  }

  return { sent };
}
