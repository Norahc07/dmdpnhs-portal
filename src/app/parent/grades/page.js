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
    .select("student_id")
    .eq("parent_id", parent?.id || "00000000-0000-0000-0000-000000000000");

  const studentIds = (links || []).map((l) => l.student_id);

  const { data: grades } = studentIds.length
    ? await supabase
        .from("grades")
        .select(
          "*, subjects(subject_name), students(lrn, profiles(first_name, last_name), sections(section_name, grade_level, school_year))"
        )
        .in("student_id", studentIds)
        .order("school_year", { ascending: false })
        .order("quarter")
    : { data: [] };

  const fallbackYear =
    grades?.[0]?.students?.sections?.school_year || SCHOOL_YEAR_DEFAULT;
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

  const sections = [
    ...new Set(
      termGrades
        .map((g) =>
          g.students?.sections
            ? `Grade ${g.students.sections.grade_level} - ${g.students.sections.section_name}`
            : null
        )
        .filter(Boolean)
    ),
  ];

  return (
    <AppShell
      role="parent"
      profile={profile}
      title="Grades"
      subtitle="Term grades for linked learners, kept by school year."
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
          <span className="font-semibold text-[#3d1212]">
            {sections.length ? sections.join(", ") : "—"}
          </span>
        </p>

        <TermGradesTable
          grades={termGrades}
          term={selected.term}
          showLearner
          emptyMessage="No grades available for this term yet."
        />
      </div>
    </AppShell>
  );
}
