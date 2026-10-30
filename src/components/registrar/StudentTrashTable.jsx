"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";
import {
  permanentlyDeleteTrashedStudent,
  restoreTrashedStudent,
} from "@/actions/activation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function studentName(row) {
  const first = row?.profiles?.first_name || "";
  const last = row?.profiles?.last_name || "";
  const full = `${last}${last && first ? ", " : ""}${first}`.trim();
  return full || "Student";
}

function sectionLabel(row) {
  if (!row?.sections) return "—";
  const g = row.sections.grade_level ?? row.grade_level;
  return `Grade ${g} · ${row.sections.section_name}`;
}

function formatDeletedAt(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

export function StudentTrashTable({ students = [], hint = "" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState("");
  const [confirmPurge, setConfirmPurge] = useState(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((row) => {
      const hay = [
        studentName(row),
        row.lrn,
        row.profiles?.email,
        sectionLabel(row),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [students, search]);

  function restore(row) {
    setBusyId(row.id);
    startTransition(async () => {
      const result = await restoreTrashedStudent(row.id);
      setBusyId("");
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result?.message || "Student restored.");
      router.refresh();
    });
  }

  function purge(row) {
    setBusyId(row.id);
    startTransition(async () => {
      const result = await permanentlyDeleteTrashedStudent(row.id);
      setBusyId("");
      setConfirmPurge(null);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result?.message || "Permanently deleted.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {hint ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {hint}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#800000]/10 bg-white px-4 py-3 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div>
          <p className="font-heading text-sm font-bold text-[#3d1212]">
            Deleted students
          </p>
          <p className="text-xs text-muted-foreground">
            These LRNs are not treated as enrolled. Restore to bring them back,
            or permanently delete.
          </p>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or LRN…"
          className="max-w-xs"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#800000]/3 hover:bg-[#800000]/3">
                <TableHead className="font-semibold text-[#3d1212]">
                  Student
                </TableHead>
                <TableHead className="font-semibold text-[#3d1212]">LRN</TableHead>
                <TableHead className="font-semibold text-[#3d1212]">
                  Section
                </TableHead>
                <TableHead className="font-semibold text-[#3d1212]">
                  Deleted
                </TableHead>
                <TableHead className="text-right font-semibold text-[#3d1212]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-2 py-6">
                      <Trash2 className="size-7 text-[#800000]/50" />
                      <p className="font-heading text-sm font-bold text-[#3d1212]">
                        Trash is empty
                      </p>
                      <p className="max-w-md text-sm text-muted-foreground">
                        Students moved from Activations appear here until you
                        restore or permanently delete them.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const busy = pending && busyId === row.id;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-[#3d1212]">
                        {studentName(row)}
                      </TableCell>
                      <TableCell className="tabular-nums">{row.lrn || "—"}</TableCell>
                      <TableCell>{sectionLabel(row)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDeletedAt(row.deleted_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => restore(row)}
                          >
                            <RotateCcw className="size-3.5" />
                            {busy && confirmPurge?.id !== row.id
                              ? "Restoring…"
                              : "Restore"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={busy}
                            onClick={() => setConfirmPurge(row)}
                          >
                            <Trash2 className="size-3.5" />
                            Delete forever
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {confirmPurge ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3d1212]/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#800000]/15 bg-white p-5 shadow-xl">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
              Permanent delete
            </p>
            <h3 className="mt-1 font-heading text-lg font-bold text-[#3d1212]">
              {studentName(confirmPurge)}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This removes the student, grades, attendance, and portal account
              forever. LRN {confirmPurge.lrn || "—"} will stay free afterward.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={pending}
                onClick={() => setConfirmPurge(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                disabled={pending}
                onClick={() => purge(confirmPurge)}
              >
                {pending && busyId === confirmPurge.id
                  ? "Deleting…"
                  : "Delete forever"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
