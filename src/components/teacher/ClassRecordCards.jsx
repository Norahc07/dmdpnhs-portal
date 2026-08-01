"use client";

import Link from "next/link";
import {
  BookOpenCheck,
  ChevronRight,
  GraduationCap,
  School,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ClassRecordCards({ groups = [] }) {
  if (!groups.length) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[#800000]/20 bg-white px-6 text-center">
        <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#800000]/8 text-[#800000]">
          <BookOpenCheck className="size-7" />
        </span>
        <h2 className="font-heading text-lg font-bold text-[#3d1212]">
          No assigned class records
        </h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Class-record cards will appear after the registrar assigns you to a
          section and subject.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {groups.map((group) => (
        <section
          key={group.section.id}
          className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-sm"
        >
          <div className="flex items-start justify-between gap-3 border-b border-[#800000]/10 bg-linear-to-r from-[#800000]/6 to-transparent p-5">
            <div className="flex gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#800000] text-white">
                <School className="size-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-lg font-bold text-[#3d1212]">
                    Grade {group.section.grade_level} ·{" "}
                    {group.section.section_name}
                  </h2>
                  {group.isAdvisory ? (
                    <Badge className="bg-[#ffd700]/25 text-[#6a4d00] hover:bg-[#ffd700]/25">
                      <ShieldCheck className="size-3" />
                      Advisory
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  School Year {group.section.school_year}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              {group.studentCount}
            </span>
          </div>

          <div className="divide-y divide-[#800000]/8">
            {group.assignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/teacher/gradebook/${assignment.id}`}
                className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#800000]/3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#800000]/8 text-[#800000] transition group-hover:bg-[#800000] group-hover:text-white">
                    <GraduationCap className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[#3d1212]">
                        {assignment.subjects?.subject_name}
                      </p>
                      {!assignment.hasRecord ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-[#800000]/15 bg-[#800000]/5 px-1.5 py-0 text-[9px] text-[#800000]"
                        >
                          New Class Record
                        </Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {assignment.subjects?.track_strand ||
                        "Core Subject (All Tracks)"}
                    </p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#800000]">
                  Open record
                  <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
