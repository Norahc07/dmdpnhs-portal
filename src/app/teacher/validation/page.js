import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { GradeValidationQueue } from "@/components/teacher/GradeValidationQueue";
import { requireRole } from "@/lib/auth-guard";
import { loadDepartmentValidationQueue } from "@/lib/grade-validation-queue";
import { getTeacherAccess } from "@/lib/teacher-access";

export const metadata = { title: "Grade Validation" };

export default async function TeacherValidationPage() {
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);

  if (!teacherAccess.canValidateGrades) {
    redirect("/teacher/gradebook");
  }

  const queue = await loadDepartmentValidationQueue(teacherAccess.departmentId);
  const dept = queue.dept;
  const items = queue.items || [];

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
      title="Grade Validation"
      subtitle={
        dept
          ? `Pending class records for ${dept.name} — validate or return to the teacher.`
          : "Pending class records for your department / committee."
      }
    >
      {queue.error || queue.hint ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {queue.error || queue.hint}
        </p>
      ) : null}
      <GradeValidationQueue items={items} />
    </AppShell>
  );
}
