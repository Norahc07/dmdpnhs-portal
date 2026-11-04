import { AppShell } from "@/components/layout/AppShell";
import { PushNotificationManager } from "@/components/notifications/PushNotificationManager";
import { PortalNotificationsInbox } from "@/components/notifications/PortalNotificationsInbox";
import { listMyPortalNotifications } from "@/actions/portal-notifications";
import { listStudentNotifications } from "@/actions/announcements";
import { requireRole } from "@/lib/auth-guard";
import { announcementTypeLabel, formatPostedAt } from "@/lib/announcements";
import Link from "next/link";

export const metadata = { title: "Notifications" };

export default async function StudentNotificationsPage() {
  const { profile, studentAccess } = await requireRole("student");
  const portal = await listMyPortalNotifications();
  const announcements =
    studentAccess?.activated && studentAccess?.enrolled
      ? await listStudentNotifications()
      : { items: [], unreadCount: 0 };

  const portalItems = portal.items || [];
  const announcementItems = (announcements.items || []).map((item) => ({
    id: `ann-${item.id}`,
    category: "announcement",
    title: item.title,
    body: announcementTypeLabel(item.postType),
    href: item.href,
    unread: item.unread,
    createdAt: item.createdAt,
  }));

  const merged = [...portalItems, ...announcementItems].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
  const unreadCount =
    (portal.unreadCount || 0) + (announcements.unreadCount || 0);

  return (
    <AppShell
      role="student"
      profile={profile}
      title="Notifications"
      subtitle="System alerts, teacher posts, grades, and phone notification-bar updates."
      studentAccess={studentAccess}
    >
      <div className="mb-4 space-y-3">
        <PushNotificationManager variant="card" />
        {!studentAccess?.activated || !studentAccess?.enrolled ? (
          <p className="rounded-xl border border-dashed border-[#800000]/20 px-4 py-3 text-sm text-muted-foreground">
            Teacher section posts appear after activation and enrollment. System
            alerts can still arrive once phone alerts are enabled.
          </p>
        ) : null}
      </div>

      <PortalNotificationsInbox
        items={merged}
        unreadCount={unreadCount}
        hint={portal.hint || portal.error || announcements.hint || ""}
        emptyText="No notifications yet. Enable phone alerts above to get sound alerts on your device."
      />

      {announcementItems.length > 0 ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Latest teacher post{" "}
          <Link
            href={announcementItems[0].href}
            className="font-medium text-[#800000] underline-offset-2 hover:underline"
          >
            {announcementItems[0].title}
          </Link>{" "}
          · {formatPostedAt(announcementItems[0].createdAt)}
        </p>
      ) : null}
    </AppShell>
  );
}
