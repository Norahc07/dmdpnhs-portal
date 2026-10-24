import Link from "next/link";
import {
  ANNOUNCEMENT_TYPE_META,
  announcementTypeLabel,
  formatPostedAt,
  sectionLabel,
} from "@/lib/announcements";
import { cn } from "@/lib/utils";
import { Paperclip } from "lucide-react";

export function AnnouncementCard({
  post,
  href,
  showUnread = false,
  actions = null,
}) {
  const meta = ANNOUNCEMENT_TYPE_META[post.postType] || ANNOUNCEMENT_TYPE_META.announcement;
  const inner = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                meta.chip
              )}
            >
              {announcementTypeLabel(post.postType)}
            </span>
            {showUnread && post.unread ? (
              <span className="inline-flex rounded-md bg-[#800000] px-2 py-0.5 text-[11px] font-semibold text-white">
                New
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 font-heading text-base font-bold text-[#3d1212]">
            {post.title}
          </h3>
        </div>
        {actions}
      </div>
      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-[#3d1212]/80">
        {post.body}
      </p>
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p>
          Posted by <span className="font-medium text-[#3d1212]">{post.postedBy}</span>
        </p>
        <p>{formatPostedAt(post.createdAt)}</p>
        <p>
          {(post.sections || []).map(sectionLabel).join(" · ") || "No sections"}
        </p>
        {post.attachments?.length ? (
          <p className="inline-flex items-center gap-1 text-[#800000]">
            <Paperclip className="size-3" />
            {post.attachments.length} attachment
            {post.attachments.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>
    </>
  );

  const className =
    "block rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] transition hover:border-[#800000]/25";

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return <article className={className}>{inner}</article>;
}
