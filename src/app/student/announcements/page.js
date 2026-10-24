import { AppShell } from "@/components/layout/AppShell";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { listStudentAnnouncements } from "@/actions/announcements";
import { requireRole } from "@/lib/auth-guard";

export const metadata = { title: "Announcements" };

export default async function StudentAnnouncementsPage() {
  const { profile, studentAccess } = await requireRole([
    "student",
    "student-enrolled",
  ]);
  const { posts, hint, error } = await listStudentAnnouncements();

  return (
    <AppShell
      role="student"
      profile={profile}
      studentAccess={studentAccess}
      title="Announcements & updates"
      subtitle="Posts from your teachers for your assigned section."
    >
      <div className="space-y-3">
        {hint || error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {hint || error}
          </div>
        ) : null}
        {(posts || []).length === 0 && !hint && !error ? (
          <p className="rounded-2xl border border-dashed border-[#800000]/20 bg-white px-4 py-8 text-center text-sm text-muted-foreground">
            No announcements for your section yet.
          </p>
        ) : null}
        {(posts || []).map((post) => (
          <AnnouncementCard
            key={post.id}
            post={post}
            showUnread
            href={`/student/announcements/${post.id}`}
          />
        ))}
      </div>
    </AppShell>
  );
}
