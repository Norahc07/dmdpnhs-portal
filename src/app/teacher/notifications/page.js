import { AppShell } from "@/components/layout/AppShell";
import { PushNotificationManager } from "@/components/notifications/PushNotificationManager";
import { PortalNotificationsInbox } from "@/components/notifications/PortalNotificationsInbox";
import { listMyPortalNotifications } from "@/actions/portal-notifications";
import { loadTeacherHandledSections } from "@/lib/announcements";
import { requireRole } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeacherAccess } from "@/lib/teacher-access";

export const metadata = { title: "Notifications" };

export default async function TeacherNotificationsPage() {
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);
  const portal = await listMyPortalNotifications();
  const items = [...(portal.items || [])];

  if (teacherAccess.canValidateGrades) {
    items.unshift({
      id: "validation-cue",
      category: "grades",
      href: "/teacher/validation",
      title: "Check the validation queue",
      body: "Review submitted class records for your department.",
      unread: true,
      createdAt: new Date().toISOString(),
    });
  }

  if (teacherAccess.teacherId) {
    const admin = createAdminClient();
    const sections = await loadTeacherHandledSections(
      admin,
      teacherAccess.teacherId
    );
    const sectionIds = sections.map((section) => section.id);
    if (sectionIds.length) {
      const { data: students } = await admin
        .from("students")
        .select("id")
        .in("section_id", sectionIds);
      const studentIds = (students || []).map((row) => row.id);
      if (studentIds.length) {
        const { count } = await admin
          .from("document_requests")
          .select("id", { count: "exact", head: true })
          .in("student_id", studentIds)
          .in("status", ["pending", "processing"]);
        if (count) {
          items.unshift({
            id: "documents-cue",
            category: "documents",
            href: "/teacher/documents",
            title: `${count} learner document request${count === 1 ? "" : "s"} in progress`,
            body: "Open Documents to see requests from your sections.",
            unread: true,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  const unreadCount =
    (portal.unreadCount || 0) + items.filter((i) => i.unread && String(i.id).includes("-cue")).length;

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
      title="Notifications"
      subtitle="Teacher coordination, grade workflow, documents, and phone alerts."
    >
      <div className="mb-4">
        <PushNotificationManager variant="card" />
      </div>
      <PortalNotificationsInbox
        items={items}
        unreadCount={unreadCount}
        hint={portal.hint || portal.error || ""}
        emptyText="No notifications right now. Enable phone alerts above for sound alerts on submitted or returned class records."
      />
    </AppShell>
  );
}
