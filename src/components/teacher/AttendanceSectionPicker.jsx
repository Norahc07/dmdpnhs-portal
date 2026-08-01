"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AttendanceSectionPicker({ sections, sectionId, date }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const sectionItems = sections.map((s) => ({
    value: s.id,
    label: `G${s.grade_level} - ${s.section_name}`,
  }));

  return (
    <div className="grid gap-3 rounded-xl border border-[#800000]/10 bg-white p-4 md:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Section</Label>
        <Select
          items={sectionItems}
          value={sectionId || ""}
          onValueChange={(v) => update("sectionId", v)}
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
        <Label>Date</Label>
        <Input
          type="date"
          value={date}
          placeholder="YYYY-MM-DD"
          onChange={(e) => update("date", e.target.value)}
        />
      </div>
    </div>
  );
}
