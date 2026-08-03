import Link from "next/link";
import { ChevronRight, School, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AttendanceSectionCards({ sections = [] }) {
  if (!sections.length) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[#800000]/20 bg-white px-6 text-center shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#800000]/8 text-[#800000] ring-1 ring-[#800000]/12">
          <School className="size-7" />
        </span>
        <h2 className="font-heading text-lg font-bold text-[#3d1212]">
          No assigned classes
        </h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Attendance cards appear for grade levels and sections you handle.
          Ask the registrar to assign your teaching load.
        </p>
      </div>
    );
  }

  // Group by grade level
  const byGrade = new Map();
  for (const section of sections) {
    const g = Number(section.grade_level) || 0;
    if (!byGrade.has(g)) byGrade.set(g, []);
    byGrade.get(g).push(section);
  }
  const grades = Array.from(byGrade.keys()).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {grades.map((grade) => (
        <section key={grade} className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-base font-bold text-[#3d1212]">
              Grade {grade}
            </h2>
            <span className="text-xs text-muted-foreground">
              {byGrade.get(grade).length} section
              {byGrade.get(grade).length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {byGrade.get(grade).map((section) => {
              const href = section.href || "#";
              return (
                <Link
                  key={section.id}
                  href={href}
                  className="group overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] transition hover:border-[#800000]/25 hover:bg-[#faf7f5]"
                >
                  <div className="portal-panel-head flex items-start justify-between gap-3 p-4">
                    <div className="flex gap-3">
                      <span
                        className={
                          section.isAdvisory
                            ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#ffd700]/25 text-[#6a4d00] ring-1 ring-[#ffd700]/40"
                            : "flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000] ring-1 ring-[#800000]/12"
                        }
                      >
                        {section.isAdvisory ? (
                          <ShieldCheck className="size-5" />
                        ) : (
                          <School className="size-5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-heading text-base font-bold text-[#3d1212]">
                            Grade {section.grade_level} · {section.section_name}
                          </p>
                          {section.isAdvisory ? (
                            <Badge className="bg-[#ffd700]/25 text-[#6a4d00] hover:bg-[#ffd700]/25">
                              Advisory
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {section.subjects?.length
                            ? section.subjects.join(" · ")
                            : "Open attendance roster"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-[#800000] transition group-hover:translate-x-0.5" />
                  </div>
                  <div className="flex items-center justify-between border-t border-[#800000]/08 px-4 py-2.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" />
                      {section.studentCount ?? "—"} learners
                    </span>
                    <span className="font-semibold text-[#800000]">
                      Take attendance
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
