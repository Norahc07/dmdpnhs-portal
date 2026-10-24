import { StatusBadge } from "@/components/layout/StatusBadge";
import { evaluationTypeLabel } from "@/lib/evaluation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function EvaluationRecordsPanel({ records = [] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <div className="portal-panel-head px-4 py-4 sm:px-5">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
          Evaluation records
        </p>
        <h3 className="mt-1 font-heading text-sm font-bold text-[#3d1212]">
          Submitted forms this period
        </h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-[#800000]/10 hover:bg-transparent">
            <TableHead>Form</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Average</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-20 text-center text-muted-foreground"
              >
                No evaluation records submitted yet.
              </TableCell>
            </TableRow>
          ) : (
            records.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  {evaluationTypeLabel(row.evaluation_type)}
                </TableCell>
                <TableCell className="text-sm">{row.targetLabel || "—"}</TableCell>
                <TableCell>
                  <StatusBadge status="Submitted" />
                </TableCell>
                <TableCell className="text-sm tabular-nums">
                  {row.average_score != null ? `${row.average_score} / 5` : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.updated_at
                    ? new Date(row.updated_at).toLocaleString("en-PH")
                    : "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}
