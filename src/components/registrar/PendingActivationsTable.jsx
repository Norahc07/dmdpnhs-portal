"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  GraduationCap,
  Phone,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { approveStudentActivation } from "@/actions/activation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_BADGE_STYLES } from "@/lib/constants";

export function PendingActivationsTable({ rows = [] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const isEmpty = !rows.length;

  function act(studentId, approve) {
    setError("");
    startTransition(async () => {
      const result = await approveStudentActivation({ studentId, approve });
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(approve ? "Student activated." : "Registration returned.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#800000]/10 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
            <UserCheck className="size-5" />
          </span>
          <div>
            <p className="font-heading text-sm font-bold text-[#3d1212]">
              Pending approvals
            </p>
            <p className="text-xs text-muted-foreground">
              Call the parent number to confirm it works, then Approve. DMDPNHS
              will SMS the Parent Access Code and notify the student.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-[#800000]/20 bg-[#800000]/5 font-semibold text-[#800000]"
        >
          {rows.length} awaiting
        </Badge>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#800000]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#800000]/3 hover:bg-[#800000]/3">
                <TableHead className="font-semibold text-[#3d1212]">
                  Learner
                </TableHead>
                <TableHead className="font-semibold text-[#3d1212]">LRN</TableHead>
                <TableHead className="font-semibold text-[#3d1212]">
                  Contact
                </TableHead>
                <TableHead className="font-semibold text-[#3d1212]">
                  Parent
                </TableHead>
                <TableHead className="font-semibold text-[#3d1212]">
                  Parent code
                </TableHead>
                <TableHead className="font-semibold text-[#3d1212]">
                  Section
                </TableHead>
                <TableHead className="font-semibold text-[#3d1212]">
                  Status
                </TableHead>
                <TableHead className="text-right font-semibold text-[#3d1212]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEmpty ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="h-56 p-0">
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#800000]/8 text-[#800000] ring-1 ring-[#800000]/10">
                        <Users className="size-7" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-heading text-base font-bold text-[#3d1212]">
                          No students awaiting activation
                        </p>
                        <p className="max-w-md text-sm text-muted-foreground">
                          When learners finish registration, their requests will
                          appear here for you to approve or return.
                        </p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#800000]/10 bg-[#800000]/5 px-2.5 py-1">
                          <GraduationCap className="size-3.5 text-[#800000]" />
                          Enrolled first
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#800000]/10 bg-[#800000]/5 px-2.5 py-1">
                          <ShieldCheck className="size-3.5 text-[#800000]" />
                          Then activate
                        </span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-[#800000]/2">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#800000]/10 text-xs font-bold text-[#800000]">
                          {(row.profiles?.first_name || "?").charAt(0)}
                          {(row.profiles?.last_name || "").charAt(0)}
                        </span>
                        <span className="font-medium text-[#3d1212]">
                          {row.profiles?.first_name} {row.profiles?.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.lrn}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-start gap-1.5">
                        <Phone className="mt-0.5 size-3.5 shrink-0 text-[#800000]/70" />
                        <div>
                          <div>{row.contact_number || "—"}</div>
                          <div className="text-muted-foreground">
                            {row.personal_email || "—"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{row.parent_name || "—"}</div>
                      <div className="text-muted-foreground">
                        {row.parent_phone || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="rounded-md bg-[#ffd700]/15 px-2 py-1 font-mono text-xs font-semibold text-[#3d1212]">
                        {row.parent_access_code_shown || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.sections
                        ? `G${row.sections.grade_level} ${row.sections.section_name}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          STATUS_BADGE_STYLES[row.activation_status] || ""
                        }
                      >
                        {row.activation_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          disabled={pending}
                          className="bg-[#800000] hover:bg-[#6a0000]"
                          onClick={() => act(row.id, true)}
                        >
                          <CheckCircle2 className="size-3.5" />
                          Verify &amp; Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => act(row.id, false)}
                        >
                          <RotateCcw className="size-3.5" />
                          Return for edits
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
