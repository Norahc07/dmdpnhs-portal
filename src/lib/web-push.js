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

const CATEGORY_LABEL = {
  system: "System",
  teacher: "Teacher",
  grades: "Grades",
  attendance: "Attendance",
  announcement: "Announcement",
  documents: "Documents",
  evaluation: "Evaluation",
};

/** Phone/desktop payload — silent:false so OS plays the alert sound. */
export function buildPortalPushPayload({
  category = "system",
  title,
  body,
  href,
  priority = "high",
  tag,
}) {
  const kind = CATEGORY_LABEL[category] || "Portal";
  return {
    title: `${kind} · ${SCHOOL_SHORT}`,
    body: snippet(body) || snippet(title) || "You have a new portal update.",
    url: href || "/student/notifications",
    tag: tag || `portal-${category}`,
    category,
    priority,
    silent: false,
    renotify: true,
    vibrate:
      priority === "high" ? [160, 70, 160, 70, 220] : [120, 80, 120],
    requireInteraction: priority === "high",
  };
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
  return buildPortalPushPayload({
    category: "announcement",
    title: `${kind} · ${SCHOOL_SHORT}`,
    body: snippet(title) || snippet(body) || "A new post was published for your section.",
    href: `/student/announcements/${id}`,
    priority: postType === "update" || postType === "reminder" ? "high" : "normal",
    tag: `announcement-${id}`,
  });
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
          {
            TTL: 60 * 60 * 12,
            urgency: payload?.priority === "high" ? "high" : "normal",
          }
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
