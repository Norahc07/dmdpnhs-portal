import { AppShell } from "@/components/layout/AppShell";
import { AnnouncementComposer } from "@/components/announcements/AnnouncementComposer";
import { TeacherAnnouncementList } from "@/components/announcements/TeacherAnnouncementList";
import { listTeacherAnnouncements } from "@/actions/announcements";
import { requireRole } from "@/lib/auth-guard";
import { getTeacherAccess } from "@/lib/teacher-access";

export const metadata = { title: "Announcements" };

export default async function TeacherAnnouncementsPage() {
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);
  const { posts, sections, hint, error } = await listTeacherAnnouncements();

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
      title="Announcements & updates"
      subtitle="Post announcements, reminders, assignments, or important updates to the sections you handle."
    >
      <div className="space-y-5">
        {hint || error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {hint || error}
          </div>
        ) : null}
        <AnnouncementComposer sections={sections || []} />
        <TeacherAnnouncementList
          posts={posts || []}
          sections={sections || []}
        />
      </div>
    </AppShell>
  );
}
