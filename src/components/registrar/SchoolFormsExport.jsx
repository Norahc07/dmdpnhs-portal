"use client";

import { useMemo, useState } from "react";
import { downloadCsv, toCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";

export function SchoolFormsExport({ students, attendance, sections }) {
  const [sectionId, setSectionId] = useState(sections[0]?.id || "");

  const sectionStudents = useMemo(
    () =>
      sectionId
        ? students.filter((s) => s.section_id === sectionId)
        : students,
    [students, sectionId]
  );

  const section = sections.find((s) => s.id === sectionId);

  const sectionItems = sections.map((s) => ({
    value: s.id,
    label: `G${s.grade_level} - ${s.section_name}`,
  }));

  function exportSf1() {
    const headers = [
      "LRN",
      "Last Name",
      "First Name",
      "Sex",
      "Birthdate",
      "Grade Level",
      "Section",
      "Status",
      "School Year",
    ];
    const rows = sectionStudents.map((s) => ({
      LRN: s.lrn,
      "Last Name": s.profiles?.last_name || "",
      "First Name": s.profiles?.first_name || "",
      Sex: s.gender || "",
      Birthdate: s.birthdate || "",
      "Grade Level": s.grade_level,
      Section: s.sections?.section_name || section?.section_name || "",
      Status: s.status,
      "School Year": section?.school_year || SCHOOL_YEAR_DEFAULT,
    }));
    downloadCsv(
      `SF1_${section?.section_name || "ALL"}_${SCHOOL_YEAR_DEFAULT}.csv`,
      toCsv(headers, rows)
    );
  }

  function exportSf2() {
    const headers = [
      "Date",
      "LRN",
      "Last Name",
      "First Name",
      "Section",
      "Status",
    ];
    const lrnSet = new Set(sectionStudents.map((s) => s.id));
    const rows = (attendance || [])
      .filter((a) => lrnSet.has(a.student_id))
      .map((a) => {
        const s = students.find((x) => x.id === a.student_id);
        return {
          Date: a.date,
          LRN: s?.lrn || "",
          "Last Name": s?.profiles?.last_name || "",
          "First Name": s?.profiles?.first_name || "",
          Section: section?.section_name || "",
          Status: a.status,
        };
      });
    downloadCsv(
      `SF2_${section?.section_name || "ALL"}_${SCHOOL_YEAR_DEFAULT}.csv`,
      toCsv(headers, rows)
    );
  }

  function exportSf5() {
    const headers = [
      "LRN",
      "Last Name",
      "First Name",
      "Grade Level",
      "Section",
      "General Status",
      "Action Taken",
    ];
    const rows = sectionStudents.map((s) => ({
      LRN: s.lrn,
      "Last Name": s.profiles?.last_name || "",
      "First Name": s.profiles?.first_name || "",
      "Grade Level": s.grade_level,
      Section: s.sections?.section_name || section?.section_name || "",
      "General Status": s.status,
      "Action Taken":
        s.status === "promoted"
          ? "Promoted"
          : s.status === "retained"
            ? "Retained"
            : s.status === "remedial"
              ? "For Remedial"
              : "Enrolled",
    }));
    downloadCsv(
      `SF5_${section?.section_name || "ALL"}_${SCHOOL_YEAR_DEFAULT}.csv`,
      toCsv(headers, rows)
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-[#800000]/10 bg-white p-4">
      <div className="max-w-sm space-y-1.5">
        <Label>Section filter</Label>
        <Select items={sectionItems} value={sectionId} onValueChange={setSectionId}>
          <SelectTrigger>
            <SelectValue placeholder="Select section" />
          </SelectTrigger>
          <SelectContent>
            {sectionItems.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-muted-foreground">
        Export LIS-compliant CSV school forms for the selected section (
        {sectionStudents.length} learners).
      </p>
      <div className="flex flex-wrap gap-2">
        <Button className="bg-[#800000] hover:bg-[#6a0000]" onClick={exportSf1}>
          Export SF1 (Registry)
        </Button>
        <Button variant="outline" onClick={exportSf2}>
          Export SF2 (Attendance)
        </Button>
        <Button variant="outline" onClick={exportSf5}>
          Export SF5 (Promotion)
        </Button>
      </div>
    </div>
  );
}
