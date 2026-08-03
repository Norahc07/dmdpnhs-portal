"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Switch among linked learners while preserving other query params (term, month…).
 */
export function ParentChildPicker({
  childrenList = [],
  selectedId,
  paramName = "studentId",
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!childrenList.length) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <div className="portal-panel-head px-4 py-3 sm:px-5">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
          Linked learner
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Choose which child to view. Same layout as the student portal.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 p-3 sm:p-4">
        {childrenList.map((child) => {
          const active = child.id === selectedId;
          const name = [
            child.profiles?.last_name,
            child.profiles?.first_name,
          ]
            .filter(Boolean)
            .join(", ") || child.lrn || "Learner";
          const params = new URLSearchParams(searchParams.toString());
          params.set(paramName, child.id);
          return (
            <Link
              key={child.id}
              href={`${pathname}?${params.toString()}`}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm transition",
                active
                  ? "border-[#800000]/20 bg-[#800000]/10 font-semibold text-[#800000] ring-1 ring-[#800000]/12"
                  : "border-[#800000]/10 bg-[#faf7f5] font-medium text-[#3d1212] hover:border-[#800000]/20 hover:bg-white"
              )}
            >
              <span className="block">{name}</span>
              <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                Grade {child.grade_level || "—"}
                {child.sections?.section_name
                  ? ` · ${child.sections.section_name}`
                  : ""}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
