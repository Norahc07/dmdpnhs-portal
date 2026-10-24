import Link from "next/link";
import { notFound } from "next/navigation";
import { Paperclip } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import {
  getStudentAnnouncement,
  markAnnouncementRead,
} from "@/actions/announcements";
import { requireRole } from "@/lib/auth-guard";
import {
  ANNOUNCEMENT_TYPE_META,
  announcementTypeLabel,
  formatPostedAt,
  sectionLabel,
} from "@/lib/announcements";
import { cn } from "@/lib/utils";

export const metadata = { title: "Announcement" };

export default async function StudentAnnouncementDetailPage({ params }) {
  const { id } = await params;
  const { profile, studentAccess } = await requireRole([
    "student",
    "student-enrolled",
  ]);
  const result = await getStudentAnnouncement(id);
  if (result.error || !result.post) notFound();

  const post = result.post;
  if (post.unread) {
    await markAnnouncementRead(post.id);
  }
  const unreadAnnouncements = Math.max(
    0,
    Number(studentAccess?.unreadAnnouncements || 0) - (post.unread ? 1 : 0)
  );
  const meta =
    ANNOUNCEMENT_TYPE_META[post.postType] || ANNOUNCEMENT_TYPE_META.announcement;

  return (
    <AppShell
      role="student"
      profile={profile}
      studentAccess={{ ...studentAccess, unreadAnnouncements }}
      title={post.title}
      subtitle={`${announcementTypeLabel(post.postType)} · ${formatPostedAt(post.createdAt)}`}
    >
      <div className="space-y-4">
        <Link
          href="/student/announcements"
          className="text-sm font-medium text-[#800000] hover:underline"
        >
          Back to announcements
        </Link>
        <article className="rounded-2xl border border-[#800000]/10 bg-white p-5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <span
            className={cn(
              "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold",
              meta.chip
            )}
          >
            {announcementTypeLabel(post.postType)}
          </span>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#3d1212]">
            {post.body}
          </p>
          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            <p>
              Posted by{" "}
              <span className="font-medium text-[#3d1212]">{post.postedBy}</span>
            </p>
            <p>Date and time posted: {formatPostedAt(post.createdAt)}</p>
            <p>
              For {(post.sections || []).map(sectionLabel).join(" · ")}
            </p>
          </div>
          {post.attachments?.length ? (
            <div className="mt-4">
              <p className="text-[11px] font-semibold tracking-wide text-[#800000] uppercase">
                Attachments
              </p>
              <ul className="mt-2 space-y-1">
                {post.attachments.map((file) => (
                  <li key={file.id}>
                    <a
                      href={file.file_url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#800000] hover:underline"
                    >
                      <Paperclip className="size-3.5" />
                      {file.file_name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      </div>
    </AppShell>
  );
}
