"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { GradebookTable } from "@/components/teacher/GradebookTable";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { broadcastQuarterlyGrades } from "@/actions/sms";
import { toast } from "sonner";
import { useTransition } from "react";

export function GradebookWorkspace({
  sections,
  subjects,
  rows,
  selected,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function updateParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const subject = subjects.find((s) => s.id === selected.subjectId);
  const section = sections.find((s) => s.id === selected.sectionId);

  const sectionItems = sections.map((s) => ({
    value: s.id,
    label: `G${s.grade_level} - ${s.section_name}`,
  }));
  const subjectItems = subjects.map((s) => ({
    value: s.id,
    label: `${s.subject_name} (G${s.grade_level})`,
  }));
  const quarterItems = [1, 2, 3, 4].map((q) => ({
    value: String(q),
    label: `Quarter ${q}`,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] md:grid-cols-4 sm:p-5">
        <div className="space-y-1.5">
          <Label className="text-[#3d1212]">Section</Label>
          <Select
            items={sectionItems}
            value={selected.sectionId || ""}
            onValueChange={(v) => updateParam("sectionId", v)}
          >
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
        <div className="space-y-1.5">
          <Label className="text-[#3d1212]">Subject</Label>
          <Select
            items={subjectItems}
            value={selected.subjectId || ""}
            onValueChange={(v) => updateParam("subjectId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjectItems.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[#3d1212]">Quarter</Label>
          <Select
            items={quarterItems}
            value={String(selected.quarter || "1")}
            onValueChange={(v) => updateParam("quarter", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {quarterItems.map((q) => (
                <SelectItem key={q.value} value={q.value}>
                  {q.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            disabled={pending || !selected.sectionId || !selected.subjectId}
            onClick={() => {
              startTransition(async () => {
                const result = await broadcastQuarterlyGrades({
                  sectionId: selected.sectionId,
                  subjectId: selected.subjectId,
                  quarter: selected.quarter,
                });
                if (result.error) toast.error(result.error);
                else toast.success(`SMS sent to ${result.sent} recipient(s)`);
              });
            }}
          >
            Broadcast grades via SMS
          </Button>
        </div>
      </div>

      {subject && selected.sectionId ? (
        <GradebookTable
          key={`${selected.sectionId}-${selected.subjectId}-${selected.quarter}`}
          initialRows={rows}
          subject={subject}
          quarter={Number(selected.quarter || 1)}
          sectionLabel={
            section
              ? `G${section.grade_level} ${section.section_name}`
              : "Section"
          }
        />
      ) : (
        <p className="rounded-2xl border border-dashed border-[#800000]/20 bg-white p-8 text-center text-sm text-muted-foreground shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          Select a section and subject to open the gradebook.
        </p>
      )}
    </div>
  );
}
