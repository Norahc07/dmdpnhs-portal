import { LayoutGrid } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TermGradesPicker } from "@/components/student/TermGradesPicker";
import { TermGradesTable } from "@/components/student/TermGradesTable";
import { requireRole } from "@/lib/auth-guard";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import {
  buildTermOptions,
  parseTermOptionValue,
  termLabel,
  termOptionLabel,
  termOptionValue,
} from "@/lib/grades-terms";

export const metadata = { title: "My Grades" };

export default async function StudentGradesPage({ searchParams }) {
  const params = await searchParams;
  const { supabase, profile } = await requireRole(["student", "student-enrolled"]);

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, grade_level, section_id, sections(section_name, grade_level, school_year)"
    )
    .eq("profile_id", profile.id)
    .maybeSingle();

  const studentId = student?.id || "00000000-0000-0000-0000-000000000000";

  const { data: grades } = await supabase
    .from("grades")
    .select("*, subjects(subject_name)")
    .eq("student_id", studentId)
    .order("school_year", { ascending: false })
    .order("quarter")
    .order("created_at");

  const fallbackYear = student?.sections?.school_year || SCHOOL_YEAR_DEFAULT;
  const options = buildTermOptions(grades || [], fallbackYear);

  const requested = parseTermOptionValue(params.termKey);
  const selected =
    (requested &&
      options.find(
        (o) => o.schoolYear === requested.schoolYear && o.term === requested.term
      )) ||
    options[0] || {
      value: termOptionValue(1, fallbackYear),
      label: termOptionLabel(1, fallbackYear),
      schoolYear: fallbackYear,
      term: 1,
    };

  const termGrades = (grades || []).filter(
    (g) =>
      g.school_year === selected.schoolYear &&
      Number(g.quarter) === Number(selected.term)
  );

  const sectionLabel = student?.sections
    ? `Grade ${student.sections.grade_level ?? student.grade_level ?? "—"} - ${student.sections.section_name}`
    : "Not yet assigned";

  return (
    <AppShell
      role="student"
      profile={profile}
      title="My Grades"
      subtitle="Grades stay available every term until you graduate."
      studentAccess={{ activated: true, enrolled: true }}
    >
      <div className="rounded-xl border border-[#800000]/10 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center gap-2 border-b-2 border-[#800000] pb-2">
          <LayoutGrid className="size-5 shrink-0 text-[#800000]" />
          <h3 className="font-heading text-xl font-bold text-[#800000] sm:text-2xl">
            {termLabel(selected.term)} Grades
          </h3>
        </div>

        <div className="mt-4">
          <TermGradesPicker options={options} selectedValue={selected.value} />
        </div>

        <p className="mt-4 mb-1 text-sm">
          <span className="text-muted-foreground">Section :</span>{" "}
          <span className="font-semibold text-[#3d1212]">{sectionLabel}</span>
        </p>

        <TermGradesTable
          grades={termGrades}
          term={selected.term}
          emptyMessage="No subject grades posted for this term yet. Grades appear after your teachers save class records."
        />
      </div>
    </AppShell>
  );
}
