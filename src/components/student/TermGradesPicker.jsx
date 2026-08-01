"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TermGradesPicker({ options, selectedValue }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const items = options.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));

  function onChange(value) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("termKey", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (!items.length) return null;

  return (
    <Select
      items={items}
      value={selectedValue || items[0]?.value || ""}
      onValueChange={onChange}
    >
      <SelectTrigger
        aria-label="Select grading term"
        className="h-8 gap-2 rounded-md border-[#800000]/40 px-3 text-xs font-medium text-[#800000] hover:bg-[#800000]/5 [&_svg]:text-[#800000]"
      >
        <SelectValue placeholder="Select term" />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
