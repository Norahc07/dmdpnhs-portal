"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { markMyPortalNotificationsRead } from "@/actions/portal-notifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL = {
  system: "System",
  teacher: "Teacher",
  grades: "Grades",
  attendance: "Attendance",
  announcement: "Announcement",
  documents: "Documents",
  evaluation: "Evaluation",
};

function formatWhen(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

export function PortalNotificationsInbox({
  items = [],
  unreadCount = 0,
  hint = "",
  emptyText = "No notifications yet.",
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function markAllRead() {
    startTransition(async () => {
      const result = await markMyPortalNotificationsRead();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Notifications marked as read.");
      router.refresh();
    });
  }

  return (
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
        <Button
          type="button"
          variant="outline"
          disabled={pending || unreadCount === 0}
          onClick={markAllRead}
        >
          {pending ? "Updating…" : "Mark all as read"}
        </Button>
      </div>

      <div className="space-y-2 p-4">
        {hint ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {hint}
          </p>
        ) : null}
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#800000]/20 px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={item.href || "#"}
              className={cn(
                "block rounded-xl border px-4 py-3 transition hover:border-[#800000]/20 hover:bg-[#faf7f5]",
                item.unread
                  ? "border-[#800000]/20 bg-[#800000]/5"
                  : "border-[#800000]/08 bg-white"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold tracking-wide text-[#800000] uppercase">
                  {CATEGORY_LABEL[item.category] || item.category || "Notice"}
                </span>
                {item.unread ? (
                  <span className="rounded-full bg-[#800000] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    New
                  </span>
                ) : null}
              </div>
              <p className="mt-1 font-medium text-[#3d1212]">{item.title}</p>
              {item.body ? (
                <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                  {item.body}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {formatWhen(item.createdAt)}
              </p>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
