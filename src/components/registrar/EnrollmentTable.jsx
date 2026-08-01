"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GRADE_LEVELS, SCHOOL_YEAR_DEFAULT } from "@/lib/constants";

export function EnrollmentTable({ students, sections }) {
  const schoolYears = useMemo(() => {
    const years = new Set(
      sections.map((s) => s.school_year).filter(Boolean)
    );
    years.add(SCHOOL_YEAR_DEFAULT);
    return Array.from(years).sort().reverse();
  }, [sections]);

  const [schoolYear, setSchoolYear] = useState(schoolYears[0] || SCHOOL_YEAR_DEFAULT);
  const [gradeLevel, setGradeLevel] = useState("all");
  const [sectionId, setSectionId] = useState("all");
  const [gender, setGender] = useState("all");

  const sectionById = useMemo(
    () => Object.fromEntries(sections.map((s) => [s.id, s])),
    [sections]
  );

  const filteredSections = sections.filter((s) => {
    if (s.school_year !== schoolYear) return false;
    if (gradeLevel !== "all" && String(s.grade_level) !== String(gradeLevel)) {
      return false;
    }
    return true;
  });

  const rows = students.filter((stu) => {
    const sec = stu.section_id ? sectionById[stu.section_id] : null;
    if (sec && sec.school_year !== schoolYear) return false;
    if (!sec && schoolYear) {
      // include unassigned only when no section filter
    }
    if (gradeLevel !== "all" && String(stu.grade_level) !== String(gradeLevel)) {
      return false;
    }
    if (sectionId !== "all" && stu.section_id !== sectionId) return false;
    if (gender !== "all" && stu.gender !== gender) return false;
    if (sec && sec.school_year !== schoolYear) return false;
    // When filtering by school year, only show students in that year's sections or unassigned
    if (stu.section_id) {
      const s = sectionById[stu.section_id];
      if (!s || s.school_year !== schoolYear) return false;
    }
    return true;
  });

  const totalsByGrade = GRADE_LEVELS.map((g) => {
    const inGrade = rows.filter((r) => Number(r.grade_level) === g);
    return {
      grade: g,
      total: inGrade.length,
      male: inGrade.filter((r) => r.gender === "Male").length,
      female: inGrade.filter((r) => r.gender === "Female").length,
    };
  }).filter((t) => t.total > 0 || gradeLevel === "all" || String(gradeLevel) === String(t.grade));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          value={schoolYear}
          onChange={(e) => {
            setSchoolYear(e.target.value);
            setSectionId("all");
          }}
          className="h-9 rounded-md border pl-3 pr-9 text-sm"
        >
          {schoolYears.map((y) => (
            <option key={y} value={y}>
              SY {y}
            </option>
          ))}
        </select>
        <select
          value={gradeLevel}
          onChange={(e) => {
            setGradeLevel(e.target.value);
            setSectionId("all");
          }}
          className="h-9 rounded-md border pl-3 pr-9 text-sm"
        >
          <option value="all">All grades</option>
          {GRADE_LEVELS.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
        <select
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="h-9 rounded-md border pl-3 pr-9 text-sm"
        >
          <option value="all">All sections</option>
          {filteredSections.map((s) => (
            <option key={s.id} value={s.id}>
              G{s.grade_level} {s.section_name}
            </option>
          ))}
        </select>
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="h-9 rounded-md border pl-3 pr-9 text-sm"
        >
          <option value="all">All genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {totalsByGrade.map((t) => (
          <div
            key={t.grade}
            className="rounded-xl border border-[#800000]/10 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-xs font-semibold tracking-wide text-[#800000] uppercase">
              Grade {t.grade}
            </p>
            <p className="mt-1 text-2xl font-bold text-[#3d1212]">{t.total}</p>
            <p className="text-xs text-muted-foreground">
              M {t.male} · F {t.female}
            </p>
          </div>
        ))}
        {gradeLevel === "all" ? (
          <div className="rounded-xl border border-[#ffd700]/40 bg-[#ffd700]/10 px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-[#800000] uppercase">
              Filtered total
            </p>
            <p className="mt-1 text-2xl font-bold text-[#3d1212]">{rows.length}</p>
            <p className="text-xs text-muted-foreground">
              M {rows.filter((r) => r.gender === "Male").length} · F{" "}
              {rows.filter((r) => r.gender === "Female").length}
            </p>
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>LRN</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Activation</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No enrollment records for these filters.
                </TableCell>
              </TableRow>
            )}
            {rows.map((stu) => {
              const sec = stu.section_id ? sectionById[stu.section_id] : null;
              return (
                <TableRow key={stu.id}>
                  <TableCell className="font-medium">
                    {stu.profiles?.first_name} {stu.profiles?.last_name}
                  </TableCell>
                  <TableCell>{stu.lrn}</TableCell>
                  <TableCell>{stu.gender}</TableCell>
                  <TableCell>{stu.grade_level}</TableCell>
                  <TableCell>
                    {sec ? `${sec.section_name}` : "—"}
                  </TableCell>
                  <TableCell>{stu.activation_status || "—"}</TableCell>
                  <TableCell>{stu.status}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
