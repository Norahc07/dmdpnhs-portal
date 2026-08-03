import { LayoutGrid } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ParentChildPicker } from "@/components/parent/ParentChildPicker";
import { StudentGradesTabs } from "@/components/student/StudentGradesTabs";
import {
  getStudentSemestralGrades,
  getStudentSubjectGrades,
} from "@/actions/student-grades";
import { requireRole } from "@/lib/auth-guard";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";

export const metadata = { title: "Child Grades" };

export default async function ParentGradesPage({ searchParams }) {
  const params = await searchParams;
  const { supabase, profile } = await requireRole("parent");

  const { data: parent } = await supabase
    .from("parents")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: links } = await supabase
    .from("parent_student_links")
    .select(
      "student_id, students(id, lrn, grade_level, profiles(first_name, last_name), sections(section_name, grade_level, school_year))"
    )
    .eq("parent_id", parent?.id || "00000000-0000-0000-0000-000000000000");

  const children = (links || []).map((l) => l.students).filter(Boolean);
  const requestedId = params.studentId;
  const selected =
    children.find((c) => c.id === requestedId) || children[0] || null;

  const schoolYear = selected?.sections?.school_year || SCHOOL_YEAR_DEFAULT;

  const [classRecord, subjectGrades] = selected?.id
    ? await Promise.all([
        getStudentSemestralGrades({
          studentId: selected.id,
          schoolYear,
        }),
        getStudentSubjectGrades({
          studentId: selected.id,
          schoolYear,
        }),
      ])
    : [{ rows: [] }, { rows: [] }];

  const sectionLabel = selected?.sections
    ? `Grade ${selected.sections.grade_level ?? selected.grade_level ?? "—"} - ${selected.sections.section_name}`
    : selected
      ? `Grade ${selected.grade_level || "—"}`
      : "Not yet assigned";

  const childName = selected
    ? `${selected.profiles?.last_name || "—"}, ${selected.profiles?.first_name || "—"}`
    : null;

  return (
    <AppShell
      role="parent"
      profile={profile}
      title="Grades"
      subtitle={
        childName
          ? `Class Record and Grades for ${childName} only.`
          : "Grades for linked learners."
      }
    >
      <div className="space-y-4">
        {children.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#800000]/20 bg-white px-5 py-10 text-center text-sm text-muted-foreground shadow-[0_12px_28px_-20px_rgba(61,18,18,0.25)]">
            No learners linked to this parent account yet.
          </div>
        ) : (
          <>
            <ParentChildPicker
              childrenList={children}
              selectedId={selected?.id}
            />

            <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
              <div className="portal-panel-head flex items-center gap-3 px-4 py-4 sm:px-6">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
                  <LayoutGrid className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
                    Parent grades
                  </p>
                  <h3 className="font-heading text-xl font-bold text-[#3d1212] sm:text-2xl">
                    Learner grades
                  </h3>
                  {childName ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {childName}
                      {selected?.lrn ? ` · LRN ${selected.lrn}` : ""} · SY{" "}
                      {schoolYear}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <p className="mb-4 rounded-xl border border-[#800000]/08 bg-[#faf7f5]/70 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Section :</span>{" "}
                  <span className="font-semibold text-[#3d1212]">
                    {sectionLabel}
                  </span>
                </p>
                {classRecord.error || subjectGrades.error ? (
                  <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {classRecord.error || subjectGrades.error}
                  </p>
                ) : null}
              </div>
            </div>

            <StudentGradesTabs
              classRecordRows={classRecord.rows || []}
              subjectGradeRows={subjectGrades.rows || []}
              privacyLabel="This learner only"
              classRecordEmpty="No class record scores yet for this learner."
              gradesEmpty="No published subject grades yet for this learner."
            />
          </>
        )}
      </div>
    </AppShell>
  );
}
