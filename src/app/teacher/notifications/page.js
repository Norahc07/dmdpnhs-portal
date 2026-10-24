import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  getEvaluationContext,
  listMyEvaluations,
} from "@/actions/evaluation";
import { loadTeacherHandledSections } from "@/lib/announcements";
import { requireRole } from "@/lib/auth-guard";
import {
  TEACHER_YEAR_END_TERM,
  computeTeacherYearCompletion,
} from "@/lib/evaluation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeacherAccess } from "@/lib/teacher-access";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifications" };

export default async function TeacherNotificationsPage() {
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);
  const items = [];

  const ctx = await getEvaluationContext();
  if (!ctx.error) {
    const listed = await listMyEvaluations({
      schoolYear: ctx.schoolYear,
      term: TEACHER_YEAR_END_TERM,
    });
    const progress = computeTeacherYearCompletion({
      sections: ctx.sections || [],
      evaluations: listed.evaluations || [],
      schoolYear: ctx.schoolYear,
    });
    if (!progress.complete) {
      items.push({
        id: "evaluation",
        href: "/teacher/evaluation",
        kicker: "Evaluation",
        title: "Year-end evaluation is still open",
        detail: `${progress.totalCompleted} of ${progress.totalRequired} required ratings submitted.`,
        unread: true,
      });
    }
  }

  if (teacherAccess.canValidateGrades) {
    items.push({
      id: "validation",
      href: "/teacher/validation",
      kicker: "Academic records",
      title: "Check the validation queue",
      detail: "Review submitted class records for your department.",
      unread: true,
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
          items.push({
            id: "documents",
            href: "/teacher/documents",
            kicker: "Documents",
            title: `${count} learner document request${count === 1 ? "" : "s"} in progress`,
            detail: "Open Documents to see requests from your sections.",
            unread: true,
          });
        }
      }
    }
  }

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
      title="Notifications"
      subtitle="Reminders for evaluation, documents, and class records."
    >
      <section className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="portal-panel-head px-5 py-4">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
            Inbox
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} notice{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="space-y-2 p-4">
          {items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#800000]/20 px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications right now.
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
                <p className="text-[11px] font-semibold tracking-wide text-[#800000] uppercase">
                  {item.kicker}
                </p>
                <p className="mt-1 font-medium text-[#3d1212]">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </Link>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
