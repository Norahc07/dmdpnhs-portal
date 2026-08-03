import { gradeRemark, isPassingGrade } from "@/lib/grades-terms";
import { cn } from "@/lib/utils";

function StatusText({ grade }) {
  const passed = isPassingGrade(grade);
  return (
    <span
      className={cn(
        "font-semibold",
        passed == null
          ? "text-muted-foreground"
          : passed
            ? "text-emerald-600"
            : "text-[#800000]"
      )}
    >
      {gradeRemark(grade)}
    </span>
  );
}

/**
 * Student/parent view of published subject grades only (one learner).
 * Never shows classmates or WW/PT/exam component scores.
 */
export function SemestralGradesTable({
  rows = [],
  emptyMessage = "No published subject grades yet.",
  gradeColumnLabel = "Grade",
  showTermColumn = false,
}) {
  const colSpan = showTermColumn ? 5 : 4;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-120 border-collapse text-sm">
          <thead>
            <tr className="portal-panel-head text-[#3d1212]">
              <th className="px-3 py-2.5 text-left font-semibold">#</th>
              <th className="px-3 py-2.5 text-left font-semibold">Subject</th>
              {showTermColumn ? (
                <th className="px-3 py-2.5 text-left font-semibold">Term</th>
              ) : null}
              <th className="px-3 py-2.5 text-right font-semibold">
                {gradeColumnLabel}
              </th>
              <th className="px-3 py-2.5 text-right font-semibold">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {rows.map((row, index) => {
              const grade = row.semestral_grade ?? row.final_transmuted_grade;
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-[#800000]/8 last:border-b-0 transition hover:bg-[#800000]/4",
                    index % 2 === 0 ? "bg-[#faf7f5]/70" : "bg-white"
                  )}
                >
                  <td className="px-3 py-3 text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="px-3 py-3 font-semibold text-[#3d1212]">
                    {row.subject_name || row.subjects?.subject_name || "—"}
                  </td>
                  {showTermColumn ? (
                    <td className="px-3 py-3 text-[#3d1212]">
                      {row.term_label || "—"}
                    </td>
                  ) : null}
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-[#3d1212]">
                    {grade ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <StatusText grade={grade} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[#800000]/08 px-4 py-2.5 text-[11px] text-muted-foreground">
        Published subject grades only. Open Class Record for Written Works,
        Performance Tasks, and Examinations.
      </p>
    </div>
  );
}
