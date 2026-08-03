"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckSquare,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  confirmStudentEnrollment,
  getStudentsForPromotion,
  getTargetSectionPreview,
  promoteStudentsBatch,
} from "@/actions/promotion";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ENROLLMENT_STATUSES,
  SCHOOL_YEAR_DEFAULT,
  nextSchoolYear,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const EOSY_FILTERS = [
  { value: "all", label: "All EOSY" },
  { value: "promoted", label: "Promoted" },
  { value: "remedial", label: "Remedial" },
  { value: "retained", label: "Retained" },
  { value: "enrolled", label: "Enrolled" },
];

const ENROLL_FILTERS = [
  { value: "all", label: "All re-enrollment" },
  { value: "none", label: "Not staged" },
  { value: ENROLLMENT_STATUSES.PENDING, label: "Pending Confirmation" },
  { value: ENROLLMENT_STATUSES.OFFICIAL, label: "Officially Enrolled" },
];

function EosyBadge({ status }) {
  const s = String(status || "enrolled").toLowerCase();
  return <StatusBadge status={s} className="capitalize" />;
}

function CapacityBar({ used, capacity }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((used / capacity) * 100)) : 0;
  const over = used > capacity;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {used}/{capacity} seats
        </span>
        <span className={over ? "font-semibold text-rose-700" : ""}>
          {Math.max(0, capacity - used)} remaining
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#800000]/10">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            over ? "bg-rose-600" : pct >= 90 ? "bg-amber-500" : "bg-[#800000]"
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function FixedTable({ table, emptyLabel, colgroup }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <Table className="table-fixed w-full min-w-[36rem]">
        {colgroup}
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow
              key={hg.id}
              className="bg-[#800000]/5 hover:bg-[#800000]/5"
            >
              {hg.headers.map((header) => (
                <TableHead key={header.id} className="text-xs">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="align-middle text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={table.getAllColumns().length}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function PromotionManager({ sections = [] }) {
  const currentYear = SCHOOL_YEAR_DEFAULT;
  const targetYearDefault = nextSchoolYear(currentYear);

  const sourceSections = useMemo(
    () =>
      sections.filter((s) => s.school_year === currentYear || !s.school_year),
    [sections, currentYear]
  );
  const targetSections = useMemo(() => {
    const next = sections.filter((s) => s.school_year === targetYearDefault);
    return next.length ? next : sections;
  }, [sections, targetYearDefault]);

  const [sourceSectionId, setSourceSectionId] = useState("");
  const [targetSectionId, setTargetSectionId] = useState("");

  useEffect(() => {
    if (!sourceSectionId && sourceSections.length) {
      const rose = sourceSections.find(
        (s) => s.section_name === "Rose" && Number(s.grade_level) === 7
      );
      setSourceSectionId(rose?.id || sourceSections[0].id);
    }
  }, [sourceSections, sourceSectionId]);

  useEffect(() => {
    if (!targetSectionId && targetSections.length) {
      const golgi = targetSections.find(
        (s) =>
          s.section_name === "Golgi" &&
          Number(s.grade_level) === 8 &&
          s.school_year === targetYearDefault
      );
      setTargetSectionId(golgi?.id || targetSections[0].id);
    }
  }, [targetSections, targetSectionId, targetYearDefault]);

  const [sourceStudents, setSourceStudents] = useState([]);
  const [targetStudents, setTargetStudents] = useState([]);
  const [targetMeta, setTargetMeta] = useState(null);
  const [enrollmentsAvailable, setEnrollmentsAvailable] = useState(true);
  const [loadingSource, setLoadingSource] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState(false);

  const [rowSelection, setRowSelection] = useState({});
  const [search, setSearch] = useState("");
  const [eosyFilter, setEosyFilter] = useState("all");
  const [enrollFilter, setEnrollFilter] = useState("all");

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertPayload, setAlertPayload] = useState(null);
  const [pending, startTransition] = useTransition();

  const sourceItems = useMemo(
    () =>
      sourceSections.map((s) => ({
        value: s.id,
        label: `Grade ${s.grade_level} · ${s.section_name} · SY ${s.school_year}`,
      })),
    [sourceSections]
  );
  const targetItems = useMemo(
    () =>
      targetSections.map((s) => ({
        value: s.id,
        label: `Grade ${s.grade_level} · ${s.section_name} · SY ${s.school_year}`,
      })),
    [targetSections]
  );

  const selectedTarget = targetSections.find((s) => s.id === targetSectionId);
  const selectedSource = sourceSections.find((s) => s.id === sourceSectionId);

  const refreshSource = useCallback(async (sectionId) => {
    if (!sectionId) {
      setSourceStudents([]);
      return;
    }
    setLoadingSource(true);
    try {
      const result = await getStudentsForPromotion(sectionId, currentYear);
      if (result.error) {
        toast.error(result.error);
        setSourceStudents([]);
        return;
      }
      setSourceStudents(result.students || []);
      setEnrollmentsAvailable(result.enrollmentsAvailable !== false);
      setRowSelection({});
    } finally {
      setLoadingSource(false);
    }
  }, [currentYear]);

  const refreshTarget = useCallback(async (sectionId) => {
    if (!sectionId) {
      setTargetStudents([]);
      setTargetMeta(null);
      return;
    }
    setLoadingTarget(true);
    try {
      const result = await getTargetSectionPreview(sectionId);
      if (result.error) {
        toast.error(result.error);
        setTargetStudents([]);
        setTargetMeta(null);
        return;
      }
      setTargetStudents(result.students || []);
      setTargetMeta(result.section || null);
    } finally {
      setLoadingTarget(false);
    }
  }, []);

  useEffect(() => {
    refreshSource(sourceSectionId);
  }, [sourceSectionId, refreshSource]);

  useEffect(() => {
    refreshTarget(targetSectionId);
  }, [targetSectionId, refreshTarget]);

  const filteredSource = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sourceStudents.filter((s) => {
      if (eosyFilter !== "all" && String(s.eosyStatus).toLowerCase() !== eosyFilter) {
        return false;
      }
      if (enrollFilter === "none" && s.reEnrollmentStatus) return false;
      if (
        enrollFilter !== "all" &&
        enrollFilter !== "none" &&
        s.reEnrollmentStatus !== enrollFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        String(s.name).toLowerCase().includes(q) ||
        String(s.lrn).includes(q)
      );
    });
  }, [sourceStudents, search, eosyFilter, enrollFilter]);

  const sourceColumns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Select all visible"
            className="size-4 accent-[#800000]"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select ${row.original.name}`}
            className="size-4 accent-[#800000]"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            disabled={
              ["retained", "remedial"].includes(
                String(row.original.eosyStatus).toLowerCase()
              )
            }
          />
        ),
        size: 40,
      },
      {
        accessorKey: "name",
        header: "Student",
        cell: ({ row }) => (
          <span className="font-medium text-[#3d1212]">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "lrn",
        header: "LRN",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue()}</span>
        ),
      },
      {
        accessorKey: "gender",
        header: "Gender",
      },
      {
        id: "eosy",
        header: "EOSY Status",
        cell: ({ row }) => <EosyBadge status={row.original.eosyStatus} />,
      },
      {
        id: "reenroll",
        header: "Re-enrollment",
        cell: ({ row }) =>
          row.original.reEnrollmentStatus ? (
            <StatusBadge status={row.original.reEnrollmentStatus} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: "avg",
        header: "Final avg",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.finalTermAverage ?? "—"}
          </span>
        ),
      },
    ],
    []
  );

  const targetColumns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Student",
        cell: ({ row }) => (
          <span className="font-medium text-[#3d1212]">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "lrn",
        header: "LRN",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue()}</span>
        ),
      },
      {
        accessorKey: "gender",
        header: "Gender",
      },
      {
        id: "reenroll",
        header: "Enrollment",
        cell: ({ row }) =>
          row.original.reEnrollmentStatus ? (
            <StatusBadge status={row.original.reEnrollmentStatus} />
          ) : (
            <span className="text-xs text-muted-foreground">Roster</span>
          ),
      },
      {
        id: "confirm",
        header: "",
        cell: ({ row }) => {
          const status = row.original.reEnrollmentStatus;
          if (!status) return null;
          const isOfficial = status === ENROLLMENT_STATUSES.OFFICIAL;
          return (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const year =
                    selectedTarget?.school_year || targetYearDefault;
                  const result = await confirmStudentEnrollment(
                    row.original.id,
                    year
                  );
                  if (result.error) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(
                    result.status === ENROLLMENT_STATUSES.OFFICIAL
                      ? "Marked Officially Enrolled"
                      : "Reverted to Pending Confirmation"
                  );
                  await Promise.all([
                    refreshSource(sourceSectionId),
                    refreshTarget(targetSectionId),
                  ]);
                });
              }}
            >
              {isOfficial ? "Undo confirm" : "Confirm"}
            </Button>
          );
        },
      },
    ],
    [
      pending,
      refreshSource,
      refreshTarget,
      selectedTarget?.school_year,
      sourceSectionId,
      targetSectionId,
      targetYearDefault,
    ]
  );

  const sourceTable = useReactTable({
    data: filteredSource,
    columns: sourceColumns,
    state: { rowSelection },
    enableRowSelection: (row) =>
      !["retained", "remedial"].includes(
        String(row.original.eosyStatus).toLowerCase()
      ),
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    autoResetAll: false,
  });

  const targetTable = useReactTable({
    data: targetStudents,
    columns: targetColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    autoResetAll: false,
  });

  const selectedIds = sourceTable
    .getSelectedRowModel()
    .rows.map((r) => r.original.id);

  function selectAllPromoted() {
    const next = {};
    for (const s of filteredSource) {
      if (String(s.eosyStatus).toLowerCase() === "promoted") {
        next[s.id] = true;
      }
    }
    setRowSelection(next);
    const n = Object.keys(next).length;
    if (!n) toast.message("No Promoted students in the current filter.");
    else toast.success(`Selected ${n} promoted learner${n === 1 ? "" : "s"}.`);
  }

  function runPromote() {
    if (!selectedIds.length) {
      toast.error("Select at least one eligible student.");
      return;
    }
    if (!targetSectionId) {
      toast.error("Choose a target section.");
      return;
    }

    const selectedRows = sourceTable.getSelectedRowModel().rows.map(
      (r) => r.original
    );
    const blocked = selectedRows.filter((s) =>
      ["retained", "remedial"].includes(String(s.eosyStatus).toLowerCase())
    );
    if (blocked.length) {
      setAlertPayload({
        type: "blocked",
        title: "Cannot promote selected students",
        message:
          "Retained or unresolved Remedial students cannot be transferred. Uncheck them or update their EOSY status first.",
        blocked,
      });
      setAlertOpen(true);
      return;
    }

    startTransition(async () => {
      const result = await promoteStudentsBatch({
        studentIds: selectedIds,
        targetSectionId,
        newSchoolYear:
          selectedTarget?.school_year || targetYearDefault,
        newGradeLevel: selectedTarget?.grade_level,
      });

      if (result.error === "blocked") {
        setAlertPayload({
          type: "blocked",
          title: "Promotion blocked",
          message: result.message,
          blocked: result.blocked || [],
        });
        setAlertOpen(true);
        return;
      }
      if (result.error === "capacity") {
        setAlertPayload({
          type: "capacity",
          title: "Section capacity exceeded",
          message: result.message,
          blocked: [],
        });
        setAlertOpen(true);
        return;
      }
      if (result.error) {
        toast.error(
          typeof result.error === "string" ? result.error : "Promotion failed"
        );
        return;
      }

      toast.success(
        `Promoted ${result.promoted} student${result.promoted === 1 ? "" : "s"} → pending confirmation`
      );
      setRowSelection({});
      await Promise.all([
        refreshSource(sourceSectionId),
        refreshTarget(targetSectionId),
      ]);
    });
  }

  const capacity = targetMeta?.capacity || selectedTarget?.capacity || 45;
  const used = targetMeta?.headcount ?? targetStudents.length;

  return (
    <div className="space-y-4">
      {!enrollmentsAvailable ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Apply <code className="font-mono text-xs">supabase/enrollments-promotion.sql</code>{" "}
          in Supabase so re-enrollment staging and confirm actions work.
        </div>
      ) : null}

      <div className="grid gap-3 rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="source-section">Source grade / section</Label>
          <Select
            value={sourceSectionId}
            onValueChange={setSourceSectionId}
            items={sourceItems}
          >
            <SelectTrigger id="source-section" className="w-full min-w-0">
              <SelectValue placeholder="Select source section" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {sourceItems.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSource ? (
            <p className="text-xs text-muted-foreground">
              Current SY roster for promotion decisions
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="target-section">Target grade / section</Label>
          <Select
            value={targetSectionId}
            onValueChange={setTargetSectionId}
            items={targetItems}
          >
            <SelectTrigger id="target-section" className="w-full min-w-0">
              <SelectValue placeholder="Select target section" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {targetItems.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTarget ? (
            <p className="text-xs text-muted-foreground">
              Destination for SY {selectedTarget.school_year}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or LRN"
            className="pl-9"
            aria-label="Search source roster"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">EOSY status</Label>
          <Select value={eosyFilter} onValueChange={setEosyFilter} items={EOSY_FILTERS}>
            <SelectTrigger className="w-[10.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EOSY_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Enrollment</Label>
          <Select
            value={enrollFilter}
            onValueChange={setEnrollFilter}
            items={ENROLL_FILTERS}
          >
            <SelectTrigger className="w-[12.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENROLL_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={selectAllPromoted}
          disabled={pending || loadingSource}
        >
          <CheckSquare className="size-3.5" />
          Select all promoted
        </Button>
        <Button
          type="button"
          className="bg-[#800000] hover:bg-[#6a0000]"
          onClick={runPromote}
          disabled={pending || !selectedIds.length}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ArrowRightLeft className="size-3.5" />
          )}
          Promote & transfer selected
          {selectedIds.length ? (
            <Badge className="ml-1 bg-white/20 text-white">
              {selectedIds.length}
            </Badge>
          ) : null}
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-heading text-base font-bold text-[#3d1212]">
                Current section roster
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedSource
                  ? `Grade ${selectedSource.grade_level} · ${selectedSource.section_name}`
                  : "Select a source section"}
                {loadingSource ? " · Loading…" : ` · ${filteredSource.length} shown`}
              </p>
            </div>
          </div>
          <FixedTable
            table={sourceTable}
            emptyLabel="No students match this source section / filters."
            colgroup={
              <colgroup>
                <col className="w-[8%]" />
                <col className="w-[26%]" />
                <col className="w-[16%]" />
                <col className="w-[10%]" />
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
              </colgroup>
            }
          />
        </section>

        <section className="space-y-3 rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-heading text-base font-bold text-[#3d1212]">
                Target section preview
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedTarget
                  ? `Grade ${selectedTarget.grade_level} · ${selectedTarget.section_name}`
                  : "Select a target section"}
                {loadingTarget ? " · Loading…" : ` · ${targetStudents.length} learners`}
              </p>
            </div>
          </div>
          <CapacityBar used={used} capacity={capacity} />
          <FixedTable
            table={targetTable}
            emptyLabel="Target section is empty — promoted learners will appear here."
            colgroup={
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[22%]" />
                <col className="w-[20%]" />
              </colgroup>
            }
          />
        </section>
      </div>

      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#3d1212]">
              <AlertTriangle className="size-4 text-amber-600" />
              {alertPayload?.title || "Action blocked"}
            </DialogTitle>
            <DialogDescription>{alertPayload?.message}</DialogDescription>
          </DialogHeader>
          {alertPayload?.blocked?.length ? (
            <ul className="max-h-40 space-y-1 overflow-auto rounded-lg border bg-[#faf7f5] p-3 text-sm">
              {alertPayload.blocked.map((b) => (
                <li key={b.id} className="flex justify-between gap-2">
                  <span>{b.name}</span>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          ) : null}
          <DialogFooter>
            <Button type="button" onClick={() => setAlertOpen(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
