import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MarkNotificationsReadButton } from "@/components/student/MarkNotificationsReadButton";
import { listStudentNotifications } from "@/actions/announcements";
import { requireRole } from "@/lib/auth-guard";
import { announcementTypeLabel, formatPostedAt } from "@/lib/announcements";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifications" };

export default async function StudentNotificationsPage() {
  const { profile, studentAccess } = await requireRole("student");
  const result =
    studentAccess?.activated && studentAccess?.enrolled
      ? await listStudentNotifications()
      : { items: [], unreadCount: 0 };

  const items = result.items || [];
  const unreadCount = result.unreadCount || 0;

  return (
    <AppShell
      role="student"
      profile={profile}
      title="Notifications"
      subtitle="Unread teacher posts and portal notices for your section."
      studentAccess={studentAccess}
    >
      <section className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="portal-panel-head flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
              Inbox
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {unreadCount} unread
            </p>
          </div>
          <MarkNotificationsReadButton disabled={unreadCount === 0} />
        </div>

        <div className="space-y-2 p-4">
          {result.hint || result.error ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {result.hint || result.error}
            </p>
          ) : null}
          {!studentAccess?.activated || !studentAccess?.enrolled ? (
            <p className="rounded-xl border border-dashed border-[#800000]/20 px-4 py-8 text-center text-sm text-muted-foreground">
              Notifications from teachers appear after you are activated and
              enrolled in a section.
            </p>
          ) : items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#800000]/20 px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "block rounded-xl border px-4 py-3 transition hover:border-[#800000]/20 hover:bg-[#faf7f5]",
                  item.unread
                    ? "border-[#800000]/20 bg-[#800000]/5"
                    : "border-[#800000]/08 bg-white"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold tracking-wide text-[#800000] uppercase">
                    {announcementTypeLabel(item.postType)}
                  </span>
                  {item.unread ? (
                    <span className="rounded-full bg-[#800000] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      New
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 font-medium text-[#3d1212]">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatPostedAt(item.createdAt)}
                </p>
              </Link>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
