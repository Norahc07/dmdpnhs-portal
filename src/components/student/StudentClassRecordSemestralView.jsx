import { gradeRemark, gradeToneClass, isPassingGrade } from "@/lib/grades-terms";
import { cn } from "@/lib/utils";

const WW_COUNT = 10;
const PT_COUNT = 10;
const EXAM_KEYS = [
  ["s1", "S1"],
  ["s2", "S2"],
  ["te", "TE"],
];

function RecordHeader({ metadata }) {
  const fields = [
    ["Region", metadata?.region],
    ["Division", metadata?.division],
    ["School Name", metadata?.schoolName],
    ["School ID", metadata?.schoolId],
    ["School Year", metadata?.schoolYear],
    ["Grade & Section", metadata?.gradeSection],
    ["Teacher", metadata?.teacher],
    ["Term", metadata?.term],
    ["Subject", metadata?.subject],
    ["Track", metadata?.track],
  ];
  return (
    <div className="grid border border-b-0 border-neutral-400 bg-white sm:grid-cols-2 xl:grid-cols-5">
      {fields.map(([label, value]) => (
        <div
          key={label}
          className="min-w-0 border-r border-b border-neutral-300 px-2 py-1.5"
        >
          <span className="block text-[9px] font-bold tracking-wide text-neutral-500 uppercase">
            {label}
          </span>
          <span className="block truncate text-xs font-semibold text-neutral-900">
            {value || "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

function cellClass(extra) {
  return cn(
    "border border-neutral-400 p-1 text-center text-[10px] tabular-nums",
    extra
  );
}

function scoreCell(value) {
  if (value === "" || value == null || Number.isNaN(Number(value))) return "—";
  return value;
}

/**
 * Student/parent Class Record view:
 * - Own row only (never classmates)
 * - WW / PT: live actual scores
 * - S1 / S2 / TE: prediction or Locked until reveal; actual after reveal/lock/finished
 */
export function StudentClassRecordSemestralView({
  rows = [],
  emptyMessage = "No class record scores yet.",
  privacyLabel = "Your record only",
}) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#800000]/20 bg-[#faf7f5] px-5 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {rows.map((row) => {
        const grade = row.semestral_grade ?? row.components?.quarterly;
        const passed = isPassingGrade(grade);
        const w = row.weights || {
          written: 40,
          performance: 40,
          assessment: 20,
        };
        const ww = row.scores?.ww || [];
        const pt = row.scores?.pt || [];
        const hps = row.hps || { ww: [], pt: [], exams: {} };
        const comps = row.components || {};
        const examsRevealed = row.exams_revealed === true;

        return (
          <section
            key={row.id}
            className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]"
          >
            <div className="portal-panel-head flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-[#800000] uppercase">
                  Class record ·{" "}
                  {row.term_label || row.metadata?.term || "Term"}
                </p>
                <h3 className="font-heading text-base font-bold text-[#3d1212]">
                  {row.subject_name || row.metadata?.subject || "Subject"}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!examsRevealed ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200">
                    Exams hidden
                    {row.exam_reveal_date
                      ? ` · shows ${row.exam_reveal_date}`
                      : ""}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                    Exams visible
                  </span>
                )}
                <span className="rounded-full bg-[#800000]/8 px-2.5 py-1 text-[11px] font-bold text-[#800000] ring-1 ring-[#800000]/12">
                  {privacyLabel}
                </span>
              </div>
            </div>

            <div className="p-3 sm:p-4">
              <RecordHeader metadata={row.metadata} />

              <div className="overflow-x-auto border border-neutral-400 bg-white">
                <table className="min-w-200 w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-100 font-bold">
                      <th
                        rowSpan={2}
                        className={cellClass(
                          "sticky left-0 z-10 min-w-40 bg-neutral-100 text-left"
                        )}
                      >
                        LEARNERS&apos; NAMES
                      </th>
                      <th colSpan={13} className={cellClass()}>
                        WRITTEN WORKS ({w.written}%)
                      </th>
                      <th colSpan={13} className={cellClass()}>
                        PERFORMANCE TASKS ({w.performance}%)
                      </th>
                      <th colSpan={5} className={cellClass()}>
                        EXAMINATIONS ({w.assessment}%)
                      </th>
                      <th rowSpan={2} className={cellClass()}>
                        IG
                      </th>
                      <th rowSpan={2} className={cellClass()}>
                        {row.term_label || "QG"}
                      </th>
                      <th rowSpan={2} className={cellClass()}>
                        Remarks
                      </th>
                    </tr>
                    <tr className="bg-neutral-50">
                      {Array.from({ length: WW_COUNT }, (_, i) => (
                        <th key={`ww-h-${i}`} className={cellClass()}>
                          {i + 1}
                        </th>
                      ))}
                      {["Total", "PS", "WS"].map((label) => (
                        <th key={`ww-${label}`} className={cellClass()}>
                          {label}
                        </th>
                      ))}
                      {Array.from({ length: PT_COUNT }, (_, i) => (
                        <th key={`pt-h-${i}`} className={cellClass()}>
                          {i + 1}
                        </th>
                      ))}
                      {["Total", "PS", "WS"].map((label) => (
                        <th key={`pt-${label}`} className={cellClass()}>
                          {label}
                        </th>
                      ))}
                      {EXAM_KEYS.map(([, label]) => (
                        <th key={label} className={cellClass()}>
                          {label}
                        </th>
                      ))}
                      {["PS", "WS"].map((label) => (
                        <th key={`ex-${label}`} className={cellClass()}>
                          {label}
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-amber-50 text-[9px] text-neutral-600">
                      <th className={cellClass("sticky left-0 z-10 bg-amber-50 text-left")}>
                        HPS
                      </th>
                      {Array.from({ length: WW_COUNT }, (_, i) => (
                        <th key={`ww-hps-${i}`} className={cellClass()}>
                          {hps.ww?.[i] || "—"}
                        </th>
                      ))}
                      <th className={cellClass()} colSpan={3} />
                      {Array.from({ length: PT_COUNT }, (_, i) => (
                        <th key={`pt-hps-${i}`} className={cellClass()}>
                          {hps.pt?.[i] || "—"}
                        </th>
                      ))}
                      <th className={cellClass()} colSpan={3} />
                      {EXAM_KEYS.map(([key]) => (
                        <th key={`ex-hps-${key}`} className={cellClass()}>
                          {hps.exams?.[key] || "—"}
                        </th>
                      ))}
                      <th className={cellClass()} colSpan={2} />
                      <th className={cellClass()} />
                      <th className={cellClass()} />
                      <th className={cellClass()} />
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        className={cellClass(
                          "sticky left-0 z-5 bg-white text-left font-medium text-[#3d1212]"
                        )}
                      >
                        {row.learner_name || "—"}
                      </td>
                      {Array.from({ length: WW_COUNT }, (_, i) => (
                        <td key={`ww-${i}`} className={cellClass()}>
                          {scoreCell(ww[i])}
                        </td>
                      ))}
                      <td className={cellClass()}>{comps.ww?.total ?? "—"}</td>
                      <td className={cellClass()}>{comps.ww?.ps ?? "—"}</td>
                      <td className={cellClass()}>{comps.ww?.ws ?? "—"}</td>
                      {Array.from({ length: PT_COUNT }, (_, i) => (
                        <td key={`pt-${i}`} className={cellClass()}>
                          {scoreCell(pt[i])}
                        </td>
                      ))}
                      <td className={cellClass()}>{comps.pt?.total ?? "—"}</td>
                      <td className={cellClass()}>{comps.pt?.ps ?? "—"}</td>
                      <td className={cellClass()}>{comps.pt?.ws ?? "—"}</td>
                      {EXAM_KEYS.map(([key]) => {
                        const cell = row.exams?.[key];
                        const mode = cell?.mode;
                        return (
                          <td
                            key={key}
                            className={cellClass(
                              mode === "prediction"
                                ? "italic text-[#800000]/80"
                                : mode === "locked"
                                  ? "text-amber-800"
                                  : null
                            )}
                            title={
                              mode === "prediction"
                                ? "Temporary min-to-pass prediction"
                                : mode === "locked"
                                  ? "Real exam score hidden until display date, exams finished, or lock"
                                  : undefined
                            }
                          >
                            {cell?.label ?? "—"}
                          </td>
                        );
                      })}
                      <td className={cellClass()}>
                        {comps.exams?.ps ?? "—"}
                      </td>
                      <td className={cellClass()}>
                        {comps.exams?.ws ?? "—"}
                      </td>
                      <td className={cellClass("font-semibold")}>
                        {comps.initial ?? "—"}
                      </td>
                      <td
                        className={cellClass(
                          cn(
                            "text-sm font-bold",
                            grade != null ? gradeToneClass(grade) : null
                          )
                        )}
                      >
                        {grade ?? "—"}
                      </td>
                      <td
                        className={cellClass(
                          cn(
                            "font-semibold",
                            passed == null
                              ? "text-muted-foreground"
                              : passed
                                ? "text-emerald-700"
                                : "text-[#800000]"
                          )
                        )}
                      >
                        {grade != null
                          ? gradeRemark(grade).toUpperCase()
                          : examsRevealed
                            ? "—"
                            : "PENDING"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground">
                Written Works and Performance Tasks update live. Examination
                columns show a temporary min-to-pass hint (italic) or Locked
                until the teacher&apos;s display date, all exams are finished, or
                the class record is locked — then real S1 / S2 / TE appear.
              </p>
            </div>
          </section>
        );
      })}
    </div>
  );
}
