import { gradeRemark, isPassingGrade, termLabel } from "@/lib/grades-terms";
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

export function TermGradesTable({
  grades,
  term,
  emptyMessage = "No grades posted for this term yet.",
  showLearner = false,
}) {
  const columnCount = showLearner ? 4 : 3;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <div className="overflow-x-auto">
      <table className="w-full min-w-120 border-collapse text-sm">
        <thead>
          <tr className="portal-panel-head text-[#3d1212]">
            {showLearner ? (
              <th className="px-3 py-2.5 text-left font-semibold">Learner</th>
            ) : null}
            <th className="px-3 py-2.5 text-left font-semibold">Subject</th>
            <th className="px-3 py-2.5 text-right font-semibold">
              {termLabel(term)}
            </th>
            <th className="px-3 py-2.5 text-right font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {grades.length === 0 && (
            <tr>
              <td
                colSpan={columnCount}
                className="px-3 py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
          {grades.map((g, index) => (
            <tr
              key={g.id}
              className={cn(
                "border-b border-[#800000]/8 last:border-b-0 transition hover:bg-[#800000]/4",
                index % 2 === 0 ? "bg-[#faf7f5]/70" : "bg-white"
              )}
            >
              {showLearner ? (
                <td className="px-3 py-3 text-[#3d1212]">
                  {g.students?.profiles?.last_name},{" "}
                  {g.students?.profiles?.first_name}
                </td>
              ) : null}
              <td className="px-3 py-3 font-semibold text-[#3d1212]">
                {g.subjects?.subject_name || "—"}
              </td>
              <td className="px-3 py-3 text-right font-semibold tabular-nums text-[#3d1212]">
                {g.final_transmuted_grade ?? "—"}
              </td>
              <td className="px-3 py-3 text-right">
                <StatusText grade={g.final_transmuted_grade} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
