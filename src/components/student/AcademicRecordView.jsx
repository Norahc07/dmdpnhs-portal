import { gradeToneClass } from "@/lib/grades-terms";
import { HUMSS_G12_CURRICULUM } from "@/lib/humss-academic-record";
import { cn } from "@/lib/utils";

/**
 * Student academic record: Term 1, Term 2, and Term 3 stay on one page.
 * Previous-term Final Grades and Remarks are never replaced.
 */
export function AcademicRecordView({
  rows = [],
  emptyHint = "No academic record yet.",
}) {
  const byTerm = new Map();
  for (const row of rows) {
    const term = Number(row.term) || 1;
    const list = byTerm.get(term) || [];
    list.push(row);
    byTerm.set(term, list);
  }

  const hasAny = rows.some(
    (row) => row.final_grade != null || row.remarks || row.subject_name
  );

  return (
    <div className="space-y-4">
      {HUMSS_G12_CURRICULUM.map((block) => {
        const saved = byTerm.get(block.term) || [];
        const byName = new Map(
          saved.map((row) => [String(row.subject_name).toLowerCase(), row])
        );
        const subjects = block.subjects.map((name) => {
          const hit =
            byName.get(name.toLowerCase()) ||
            saved.find(
              (row) =>
                String(row.subject_name).toLowerCase() === name.toLowerCase()
            );
          return {
            name,
            final_grade: hit?.final_grade ?? hit?.semestral_grade ?? null,
            remarks: hit?.remarks || "—",
          };
        });

        return (
          <section
            key={block.term}
            className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]"
          >
            <div className="portal-panel-head px-4 py-3">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[#800000] uppercase">
                Academic record
              </p>
              <h3 className="font-heading text-lg font-bold text-[#3d1212]">
                {block.label}
              </h3>
              <p className="text-xs text-muted-foreground">
                Final Grade and Remarks only. This term stays visible when later
                terms are encoded.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-140 border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#800000]/10 text-[#3d1212]">
                    <th className="px-3 py-2.5 text-left font-semibold">#</th>
                    <th className="px-3 py-2.5 text-left font-semibold">
                      Subject
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Final Grade
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject, index) => (
                    <tr
                      key={subject.name}
                      className={cn(
                        "border-b border-[#800000]/8 last:border-b-0",
                        index % 2 === 0 ? "bg-[#faf7f5]/70" : "bg-white"
                      )}
                    >
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-[#3d1212]">
                        {subject.name}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2.5 text-right font-semibold tabular-nums",
                          gradeToneClass(subject.final_grade)
                        )}
                      >
                        {subject.final_grade ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-[#3d1212]">
                        {subject.remarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      {!hasAny ? (
        <p className="text-center text-sm text-muted-foreground">{emptyHint}</p>
      ) : null}
    </div>
  );
}
