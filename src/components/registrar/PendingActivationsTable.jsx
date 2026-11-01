"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Eye,
  GraduationCap,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  approveStudentActivation,
  deleteActivatedStudent,
  updateActivatedStudent,
} from "@/actions/activation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TablePaginationBar,
  usePagedRows,
} from "@/components/ui/table-pagination";
import {
  hasGuardianDetailsReady as guardianContactsReady,
  resolveActivationStatus,
} from "@/lib/activation-status";
import { GRADE_LEVELS, STATUS_BADGE_STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-9 text-sm";
const filterSelectClass = "h-9 rounded-md border border-input bg-white pl-3 pr-9 text-sm";

/** Shared column widths so Pending + Activated tables align visually. */
const COL = {
  name: "w-[26%] min-w-[11rem]",
  lrn: "w-[16%] min-w-[8.5rem]",
  section: "w-[20%] min-w-[9rem]",
  status: "w-[14%] min-w-[7rem]",
  action: "w-[24%] min-w-[12rem]",
};

function ActivationsColGroup() {
  return (
    <colgroup>
      <col className={COL.name} />
      <col className={COL.lrn} />
      <col className={COL.section} />
      <col className={COL.status} />
      <col className={COL.action} />
    </colgroup>
  );
}

function studentFullName(row) {
  return `${row.profiles?.first_name || ""} ${row.profiles?.last_name || ""}`.trim() || "—";
}

function sectionLabel(row) {
  if (!row.sections) return "—";
  return `Grade ${row.sections.grade_level} · ${row.sections.section_name}`;
}

function splitParentName(fullName = "") {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return {
    first: parts.slice(0, -1).join(" "),
    last: parts[parts.length - 1],
  };
}

function formatBirthdateDisplay(value) {
  if (!value) return null;
  const raw = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  try {
    return new Date(`${raw}T00:00:00`).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return raw;
  }
}

function birthdateInputValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

const fieldLabelClass =
  "text-[10px] font-semibold tracking-wide text-muted-foreground uppercase";
const compactInputClass = "h-8 text-sm";
const compactSelectClass = cn(selectClass, "h-8 py-0 text-sm");

function FieldRead({ label, value, mono = false }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className={fieldLabelClass}>{label}</p>
      <p
        className={cn(
          "truncate text-sm font-medium text-[#3d1212]",
          mono && "font-mono text-xs tabular-nums"
        )}
        title={value || "—"}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function FieldEdit({ label, htmlFor, children }) {
  return (
    <div className="min-w-0 space-y-1">
      <Label htmlFor={htmlFor} className={fieldLabelClass}>
        {label}
      </Label>
      {children}
    </div>
  );
}

function PanelSection({ title, children }) {
  return (
    <section className="rounded-xl border border-[#800000]/10 bg-[#faf7f5]/80 p-3">
      <p className="mb-2.5 text-[10px] font-bold tracking-wide text-[#800000] uppercase">
        {title}
      </p>
      {children}
    </section>
  );
}

function SideSheet({
  open,
  onClose,
  children,
  closeLabel = "Close panel",
  labelledBy,
}) {
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label={closeLabel}
        className={cn(
          "absolute inset-0 bg-black/25 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "absolute inset-y-0 right-0 flex h-dvh w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-black/5 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {children}
      </aside>
    </div>
  );
}

function StudentPanelHeader({
  eyebrow,
  student,
  onClose,
  titleId = "student-panel-title",
}) {
  const initials = `${(student?.profiles?.first_name || "?").charAt(0)}${(
    student?.profiles?.last_name || ""
  ).charAt(0)}`;

  return (
    <div className="shrink-0 border-b border-[#800000]/10 bg-gradient-to-br from-[#800000]/10 via-[#faf7f5] to-white px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#800000] text-sm font-bold text-white shadow-sm">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-wide text-[#800000] uppercase">
              {eyebrow}
            </p>
            <h2
              id={titleId}
              className="mt-0.5 truncate font-heading text-base font-bold text-[#3d1212]"
            >
              {student ? studentFullName(student) : "Student"}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {student?.lrn ? (
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  LRN {student.lrn}
                </span>
              ) : null}
              {student ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 px-1.5 text-[10px]",
                    STATUS_BADGE_STYLES[displayActivationStatus(student)] || ""
                  )}
                >
                  {displayActivationStatus(student)}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function StudentPanelFooter({ children }) {
  return (
    <div className="shrink-0 border-t border-[#800000]/10 bg-white px-4 py-3">
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function parentDisplayParts(student) {
  const fromMapped = splitParentName(student?.parent_name);
  if (fromMapped.first || fromMapped.last) return fromMapped;
  return splitParentName(student?.emergency_contact_name);
}

function parentPhoneOf(student) {
  return student?.parent_phone || student?.emergency_contact_number || "";
}

function hasGuardianDetailsReady(student) {
  return guardianContactsReady({
    ...student,
    emergency_contact_name:
      student?.emergency_contact_name || student?.parent_name || "",
    emergency_contact_number: parentPhoneOf(student),
  });
}

function displayActivationStatus(student) {
  return resolveActivationStatus({
    ...student,
    emergency_contact_name:
      student?.emergency_contact_name || student?.parent_name || "",
    emergency_contact_number: parentPhoneOf(student),
  });
}

function canVerifyActivation(student) {
  return displayActivationStatus(student) === "pending";
}

function StudentViewSheet({ student, open, onClose, onEdit }) {
  const parent = parentDisplayParts(student);

  return (
    <SideSheet
      open={open}
      onClose={onClose}
      closeLabel="Close student details"
      labelledBy="student-view-title"
    >
      {student ? (
        <>
          <StudentPanelHeader
            eyebrow="Student details"
            student={student}
            onClose={onClose}
            titleId="student-view-title"
          />
          <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 overflow-hidden px-4 py-3">
            <div className="space-y-3">
              <PanelSection title="Learner">
                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                  <FieldRead
                    label="First name"
                    value={student.profiles?.first_name || null}
                  />
                  <FieldRead
                    label="Last name"
                    value={student.profiles?.last_name || null}
                  />
                  <FieldRead
                    label="Birthdate"
                    value={formatBirthdateDisplay(student.birthdate)}
                  />
                  <FieldRead label="Gender" value={student.gender || null} />
                  <FieldRead
                    label="Grade level"
                    value={
                      student.grade_level != null
                        ? `Grade ${student.grade_level}`
                        : null
                    }
                  />
                  <FieldRead label="Section" value={sectionLabel(student)} />
                  <FieldRead label="LRN" value={student.lrn} mono />
                  <FieldRead
                    label="Status"
                    value={displayActivationStatus(student) || null}
                  />
                </div>
              </PanelSection>

              <PanelSection title="Parent / guardian">
                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                  <FieldRead
                    label="First name"
                    value={parent.first || null}
                  />
                  <FieldRead label="Last name" value={parent.last || null} />
                  <div className="col-span-2">
                    <FieldRead
                      label="Contact number"
                      value={parentPhoneOf(student) || null}
                      mono
                    />
                  </div>
                </div>
              </PanelSection>
            </div>
          </div>
          <StudentPanelFooter>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              type="button"
              className="flex-1 bg-[#800000] hover:bg-[#6a0000]"
              onClick={() => {
                onClose();
                onEdit?.(student);
              }}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
          </StudentPanelFooter>
        </>
      ) : null}
    </SideSheet>
  );
}

function StudentEditSheet({
  student,
  sections,
  open,
  pending,
  error,
  onClose,
  onSubmit,
}) {
  const parentParts = parentDisplayParts(student);
  const [firstName, setFirstName] = useState(
    student?.profiles?.first_name || ""
  );
  const [lastName, setLastName] = useState(student?.profiles?.last_name || "");
  const [birthdate, setBirthdate] = useState(
    birthdateInputValue(student?.birthdate)
  );
  const [gender, setGender] = useState(student?.gender || "Male");
  const [gradeLevel, setGradeLevel] = useState(
    String(student?.grade_level || "")
  );
  const [sectionId, setSectionId] = useState(student?.section_id || "");
  const [parentFirstName, setParentFirstName] = useState(parentParts.first);
  const [parentLastName, setParentLastName] = useState(parentParts.last);
  const [parentPhone, setParentPhone] = useState(parentPhoneOf(student));

  useEffect(() => {
    if (!open || !student) return;
    const parts = parentDisplayParts(student);
    setFirstName(student.profiles?.first_name || "");
    setLastName(student.profiles?.last_name || "");
    setBirthdate(birthdateInputValue(student.birthdate));
    setGender(student.gender || "Male");
    setGradeLevel(String(student.grade_level || ""));
    setSectionId(student.section_id || "");
    setParentFirstName(parts.first);
    setParentLastName(parts.last);
    setParentPhone(parentPhoneOf(student));
  }, [open, student]);

  const gradeSections = sections.filter(
    (s) => !gradeLevel || String(s.grade_level) === String(gradeLevel)
  );

  return (
    <SideSheet
      open={open}
      onClose={onClose}
      closeLabel="Close edit student"
      labelledBy="student-edit-title"
    >
      {student ? (
        <form
          key={student.id}
          className="flex h-full min-h-0 flex-col overflow-hidden"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              studentId: student.id,
              firstName,
              lastName,
              birthdate,
              gender,
              gradeLevel,
              sectionId: sectionId || null,
              parentFirstName,
              parentLastName,
              parentPhone,
            });
          }}
        >
          <StudentPanelHeader
            eyebrow="Edit student"
            student={student}
            onClose={onClose}
            titleId="student-edit-title"
          />
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3">
            <PanelSection title="Learner">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                <FieldEdit label="First name" htmlFor="edit-first-name">
                  <Input
                    id="edit-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="e.g. Juan"
                    className={compactInputClass}
                  />
                </FieldEdit>
                <FieldEdit label="Last name" htmlFor="edit-last-name">
                  <Input
                    id="edit-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="e.g. Dela Cruz"
                    className={compactInputClass}
                  />
                </FieldEdit>
                <FieldEdit label="Birthdate" htmlFor="edit-birthdate">
                  <Input
                    id="edit-birthdate"
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    required
                    className={compactInputClass}
                  />
                </FieldEdit>
                <FieldEdit label="Gender" htmlFor="edit-gender">
                  <select
                    id="edit-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                    className={compactSelectClass}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </FieldEdit>
                <FieldEdit label="Grade level" htmlFor="edit-grade">
                  <select
                    id="edit-grade"
                    value={gradeLevel}
                    onChange={(e) => {
                      setGradeLevel(e.target.value);
                      setSectionId("");
                    }}
                    required
                    className={compactSelectClass}
                  >
                    <option value="">Select grade</option>
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </FieldEdit>
                <FieldEdit label="Section" htmlFor="edit-section">
                  <select
                    id="edit-section"
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                    required
                    className={compactSelectClass}
                  >
                    <option value="">Select section</option>
                    {gradeSections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.section_name}
                        {s.school_year ? ` (${s.school_year})` : ""}
                      </option>
                    ))}
                  </select>
                </FieldEdit>
                <div className="col-span-2">
                  <FieldEdit label="LRN" htmlFor="edit-lrn">
                    <Input
                      id="edit-lrn"
                      value={student.lrn || ""}
                      disabled
                      className={cn(compactInputClass, "bg-muted/50 font-mono")}
                    />
                  </FieldEdit>
                </div>
              </div>
            </PanelSection>

            <PanelSection title="Parent / guardian">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                <FieldEdit label="First name" htmlFor="edit-parent-first">
                  <Input
                    id="edit-parent-first"
                    value={parentFirstName}
                    onChange={(e) => setParentFirstName(e.target.value)}
                    required
                    placeholder="e.g. Maria"
                    className={compactInputClass}
                  />
                </FieldEdit>
                <FieldEdit label="Last name" htmlFor="edit-parent-last">
                  <Input
                    id="edit-parent-last"
                    value={parentLastName}
                    onChange={(e) => setParentLastName(e.target.value)}
                    required
                    placeholder="e.g. Dela Cruz"
                    className={compactInputClass}
                  />
                </FieldEdit>
                <div className="col-span-2">
                  <FieldEdit label="Contact number" htmlFor="edit-parent-phone">
                    <Input
                      id="edit-parent-phone"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      required
                      placeholder="09XXXXXXXXX"
                      className={cn(compactInputClass, "font-mono")}
                    />
                  </FieldEdit>
                </div>
              </div>
            </PanelSection>

            {error ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </p>
            ) : null}
          </div>
          <StudentPanelFooter>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="flex-1 bg-[#800000] hover:bg-[#6a0000]"
            >
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </StudentPanelFooter>
        </form>
      ) : null}
    </SideSheet>
  );
}

function SortableHead({ label, column, sortKey, sortDir, onSort, className }) {
  const active = sortKey === column;
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead className={cn("font-semibold text-[#3d1212]", className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-0.5 py-0.5 text-left hover:text-[#800000]",
          active && "text-[#800000]"
        )}
      >
        {label}
        <Icon
          className={cn("size-3.5 shrink-0", active ? "opacity-100" : "opacity-40")}
          aria-hidden
        />
      </button>
    </TableHead>
  );
}

function useActivationsQuery(rows, { includeStatusFilter = false } = {}) {
  const [search, setSearch] = useState("");
  const [gradeLevel, setGradeLevel] = useState("all");
  const [sectionId, setSectionId] = useState("all");
  const [gender, setGender] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = (rows || []).filter((row) => {
      if (
        gradeLevel !== "all" &&
        String(row.grade_level ?? row.sections?.grade_level ?? "") !==
          String(gradeLevel)
      ) {
        return false;
      }
      if (sectionId !== "all" && String(row.section_id || "") !== String(sectionId)) {
        return false;
      }
      if (
        gender !== "all" &&
        String(row.gender || "").toLowerCase() !== String(gender).toLowerCase()
      ) {
        return false;
      }
      if (
        includeStatusFilter &&
        statusFilter !== "all" &&
        displayActivationStatus(row) !== statusFilter
      ) {
        return false;
      }
      if (q) {
        const hay = [
          studentFullName(row),
          row.lrn,
          sectionLabel(row),
          displayActivationStatus(row),
          row.parent_name,
          row.emergency_contact_name,
          row.parent_phone,
          row.emergency_contact_number,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      let av = "";
      let bv = "";
      if (sortKey === "lrn") {
        av = String(a.lrn || "");
        bv = String(b.lrn || "");
      } else if (sortKey === "section") {
        av = sectionLabel(a);
        bv = sectionLabel(b);
      } else if (sortKey === "status") {
        av = displayActivationStatus(a);
        bv = displayActivationStatus(b);
      } else if (sortKey === "grade") {
        av = Number(a.grade_level ?? a.sections?.grade_level ?? 0);
        bv = Number(b.grade_level ?? b.sections?.grade_level ?? 0);
        return (av - bv) * dir;
      } else {
        av = studentFullName(a).toLowerCase();
        bv = studentFullName(b).toLowerCase();
      }
      return av.localeCompare(bv, undefined, { numeric: true }) * dir;
    });

    return list;
  }, [
    rows,
    search,
    gradeLevel,
    sectionId,
    gender,
    statusFilter,
    includeStatusFilter,
    sortKey,
    sortDir,
  ]);

  return {
    filteredSorted,
    search,
    setSearch,
    gradeLevel,
    setGradeLevel,
    sectionId,
    setSectionId,
    gender,
    setGender,
    statusFilter,
    setStatusFilter,
    sortKey,
    sortDir,
    toggleSort,
  };
}

function ActivationsTableToolbar({
  sections = [],
  includeStatusFilter = false,
  query,
}) {
  const {
    search,
    setSearch,
    gradeLevel,
    setGradeLevel,
    sectionId,
    setSectionId,
    gender,
    setGender,
    statusFilter,
    setStatusFilter,
  } = query;

  const sectionOptions = useMemo(() => {
    return [...sections]
      .filter((s) => {
        if (gradeLevel === "all") return true;
        return String(s.grade_level) === String(gradeLevel);
      })
      .sort(
        (a, b) =>
          Number(a.grade_level) - Number(b.grade_level) ||
          String(a.section_name).localeCompare(String(b.section_name))
      );
  }, [sections, gradeLevel]);

  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-[#800000]/10 bg-[#faf7f5]/80 p-3">
      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name, LRN, parent…"
        className="w-full min-w-[14rem] sm:w-64"
        aria-label="Search students"
      />
      <select
        value={gradeLevel}
        onChange={(e) => {
          setGradeLevel(e.target.value);
          setSectionId("all");
        }}
        className={filterSelectClass}
        aria-label="Filter by grade"
      >
        <option value="all">All grades</option>
        {GRADE_LEVELS.map((g) => (
          <option key={g} value={g}>
            Grade {g}
          </option>
        ))}
      </select>
      <select
        value={sectionId}
        onChange={(e) => setSectionId(e.target.value)}
        className={filterSelectClass}
        aria-label="Filter by section"
      >
        <option value="all">All sections</option>
        {sectionOptions.map((s) => (
          <option key={s.id} value={s.id}>
            Grade {s.grade_level} · {s.section_name}
          </option>
        ))}
      </select>
      <select
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        className={filterSelectClass}
        aria-label="Filter by gender"
      >
        <option value="all">All genders</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
      </select>
      {includeStatusFilter ? (
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={filterSelectClass}
          aria-label="Filter by activation status"
        >
          <option value="all">All statuses</option>
          <option value="incomplete">Incomplete</option>
          <option value="pending">Pending</option>
        </select>
      ) : null}
    </div>
  );
}

function PendingTable({
  rows,
  sections = [],
  pending,
  onApprove,
  onReturn,
  onView,
  onEdit,
}) {
  const query = useActivationsQuery(rows, { includeStatusFilter: true });
  const {
    pageRows,
    page,
    setPage,
    pageSize,
    changePageSize,
    total,
    totalPages,
    start,
    end,
  } = usePagedRows(query.filteredSorted);
  const sourceEmpty = !rows.length;
  const filterEmpty = !sourceEmpty && !query.filteredSorted.length;

  return (
    <div className="space-y-3">
      <ActivationsTableToolbar
        sections={sections}
        includeStatusFilter
        query={query}
      />
      <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="overflow-x-auto">
          <Table className="w-full table-fixed">
            <ActivationsColGroup />
            <TableHeader>
              <TableRow className="bg-[#800000]/3 hover:bg-[#800000]/3">
                <SortableHead
                  label="Student name"
                  column="name"
                  sortKey={query.sortKey}
                  sortDir={query.sortDir}
                  onSort={query.toggleSort}
                  className={COL.name}
                />
                <SortableHead
                  label="LRN"
                  column="lrn"
                  sortKey={query.sortKey}
                  sortDir={query.sortDir}
                  onSort={query.toggleSort}
                  className={COL.lrn}
                />
                <SortableHead
                  label="Section"
                  column="section"
                  sortKey={query.sortKey}
                  sortDir={query.sortDir}
                  onSort={query.toggleSort}
                  className={COL.section}
                />
                <SortableHead
                  label="Status"
                  column="status"
                  sortKey={query.sortKey}
                  sortDir={query.sortDir}
                  onSort={query.toggleSort}
                  className={COL.status}
                />
                <TableHead
                  className={cn(
                    "text-right font-semibold text-[#3d1212]",
                    COL.action
                  )}
                >
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourceEmpty || filterEmpty ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-56 p-0">
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#800000]/8 text-[#800000] ring-1 ring-[#800000]/10">
                        <Users className="size-7" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-heading text-base font-bold text-[#3d1212]">
                          {filterEmpty
                            ? "No matching pending students"
                            : "No students awaiting activation"}
                        </p>
                        <p className="max-w-md text-sm text-muted-foreground">
                          {filterEmpty
                            ? "Try clearing search or filters to see more learners."
                            : "Newly enrolled or registered learners appear here. Use View / Edit for parent contacts, then Verify & Approve when ready."}
                        </p>
                      </div>
                      {!filterEmpty ? (
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
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-[#800000]/2">
                    <TableCell className={COL.name}>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#800000]/10 text-xs font-bold text-[#800000]">
                          {(row.profiles?.first_name || "?").charAt(0)}
                          {(row.profiles?.last_name || "").charAt(0)}
                        </span>
                        <span className="truncate font-medium text-[#3d1212]">
                          {studentFullName(row)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn("font-mono text-xs tabular-nums", COL.lrn)}
                    >
                      {row.lrn}
                    </TableCell>
                    <TableCell className={cn("truncate text-sm", COL.section)}>
                      {sectionLabel(row)}
                    </TableCell>
                    <TableCell className={COL.status}>
                      <Badge
                        variant="outline"
                        className={
                          STATUS_BADGE_STYLES[displayActivationStatus(row)] || ""
                        }
                      >
                        {displayActivationStatus(row)}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn("text-right", COL.action)}>
                      <div className="inline-flex flex-wrap items-center justify-end gap-2">
                        {canVerifyActivation(row) ? (
                          <>
                            <Button
                              size="sm"
                              disabled={pending}
                              className="bg-[#800000] hover:bg-[#6a0000]"
                              onClick={() => onApprove(row.id)}
                            >
                              <CheckCircle2 className="size-3.5" />
                              Verify &amp; Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={pending}
                              onClick={() => onReturn(row.id)}
                            >
                              <RotateCcw className="size-3.5" />
                              Return
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Waiting for parent/guardian contacts
                          </span>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground"
                                aria-label={`Actions for ${studentFullName(row)}`}
                              />
                            }
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-36">
                            <DropdownMenuItem onClick={() => onView?.(row)}>
                              <Eye className="size-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit?.(row)}>
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <TablePaginationBar
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          changePageSize={changePageSize}
          total={total}
          totalPages={totalPages}
          start={start}
          end={end}
        />
      </div>
    </div>
  );
}

function ActivatedTable({ rows, sections = [], onView, onEdit, onDelete }) {
  const query = useActivationsQuery(rows);
  const {
    pageRows,
    page,
    setPage,
    pageSize,
    changePageSize,
    total,
    totalPages,
    start,
    end,
  } = usePagedRows(query.filteredSorted);
  const sourceEmpty = !rows.length;
  const filterEmpty = !sourceEmpty && !query.filteredSorted.length;

  return (
    <div className="space-y-3">
      <ActivationsTableToolbar sections={sections} query={query} />
      <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="overflow-x-auto">
          <Table className="w-full table-fixed">
            <ActivationsColGroup />
            <TableHeader>
              <TableRow className="bg-[#800000]/3 hover:bg-[#800000]/3">
                <SortableHead
                  label="Student name"
                  column="name"
                  sortKey={query.sortKey}
                  sortDir={query.sortDir}
                  onSort={query.toggleSort}
                  className={COL.name}
                />
                <SortableHead
                  label="LRN"
                  column="lrn"
                  sortKey={query.sortKey}
                  sortDir={query.sortDir}
                  onSort={query.toggleSort}
                  className={COL.lrn}
                />
                <SortableHead
                  label="Section"
                  column="section"
                  sortKey={query.sortKey}
                  sortDir={query.sortDir}
                  onSort={query.toggleSort}
                  className={COL.section}
                />
                <SortableHead
                  label="Status"
                  column="status"
                  sortKey={query.sortKey}
                  sortDir={query.sortDir}
                  onSort={query.toggleSort}
                  className={COL.status}
                />
                <TableHead
                  className={cn(
                    "text-right font-semibold text-[#3d1212]",
                    COL.action
                  )}
                >
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourceEmpty || filterEmpty ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-56 p-0">
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#800000]/8 text-[#800000] ring-1 ring-[#800000]/10">
                        <Users className="size-7" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-heading text-base font-bold text-[#3d1212]">
                          {filterEmpty
                            ? "No matching activated students"
                            : "No activated students yet"}
                        </p>
                        <p className="max-w-md text-sm text-muted-foreground">
                          {filterEmpty
                            ? "Try clearing search or filters to see more learners."
                            : "Approved activations will show up here after you verify pending requests."}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-[#800000]/2">
                    <TableCell className={COL.name}>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#800000]/10 text-xs font-bold text-[#800000]">
                          {(row.profiles?.first_name || "?").charAt(0)}
                          {(row.profiles?.last_name || "").charAt(0)}
                        </span>
                        <span className="truncate font-medium text-[#3d1212]">
                          {studentFullName(row)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn("font-mono text-xs tabular-nums", COL.lrn)}
                    >
                      {row.lrn}
                    </TableCell>
                    <TableCell className={cn("truncate text-sm", COL.section)}>
                      {sectionLabel(row)}
                    </TableCell>
                    <TableCell className={COL.status}>
                      <Badge
                        variant="outline"
                        className={
                          STATUS_BADGE_STYLES[displayActivationStatus(row)] || ""
                        }
                      >
                        {displayActivationStatus(row)}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn("text-right", COL.action)}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground"
                              aria-label={`Actions for ${studentFullName(row)}`}
                            />
                          }
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-36">
                          <DropdownMenuItem onClick={() => onView(row)}>
                            <Eye className="size-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(row)}>
                            <Pencil className="size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDelete(row)}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <TablePaginationBar
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          changePageSize={changePageSize}
          total={total}
          totalPages={totalPages}
          start={start}
          end={end}
        />
      </div>
    </div>
  );
}

export function PendingActivationsTable({
  pendingRows = [],
  activatedRows = [],
  sections = [],
  rows,
  loadError = "",
}) {
  const router = useRouter();
  const [pendingList, setPendingList] = useState(
    pendingRows.length ? pendingRows : rows || []
  );
  const [activatedList, setActivatedList] = useState(activatedRows || []);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [viewStudent, setViewStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [deleteStudent, setDeleteStudent] = useState(null);

  useEffect(() => {
    setPendingList(pendingRows.length ? pendingRows : rows || []);
  }, [pendingRows, rows]);

  useEffect(() => {
    setActivatedList(activatedRows || []);
  }, [activatedRows]);

  const sortedSections = useMemo(
    () =>
      [...sections].sort(
        (a, b) =>
          Number(a.grade_level) - Number(b.grade_level) ||
          String(a.section_name).localeCompare(String(b.section_name))
      ),
    [sections]
  );

  function act(studentId, approve) {
    setError("");
    startTransition(async () => {
      const result = await approveStudentActivation({ studentId, approve });
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      const moved = pendingList.find((r) => r.id === studentId);
      setPendingList((list) => list.filter((r) => r.id !== studentId));
      if (approve && moved) {
        setActivatedList((list) => [
          { ...moved, activation_status: "active" },
          ...list,
        ]);
      }
      toast.success(approve ? "Student activated." : "Registration returned.");
    });
  }

  function applyEditedRow(list, payload, section) {
    const guardianName =
      `${payload.parentFirstName || ""} ${payload.parentLastName || ""}`.trim();
    const phone = String(payload.parentPhone || "").replace(/\D/g, "");
    const promoteToPending =
      guardianName &&
      phone.length >= 10 &&
      String(
        list.find((r) => r.id === payload.studentId)?.activation_status || ""
      ).toLowerCase() === "incomplete";
    return list.map((row) =>
      row.id === payload.studentId
        ? {
            ...row,
            birthdate: payload.birthdate || row.birthdate || null,
            gender: payload.gender || row.gender || null,
            grade_level:
              payload.gradeLevel != null && payload.gradeLevel !== ""
                ? Number(payload.gradeLevel)
                : row.grade_level,
            section_id: payload.sectionId,
            sections: section
              ? {
                  section_name: section.section_name,
                  grade_level: section.grade_level,
                  school_year: section.school_year,
                }
              : row.sections,
            profiles: {
              ...row.profiles,
              first_name: payload.firstName,
              last_name: payload.lastName,
            },
            emergency_contact_name: guardianName,
            emergency_contact_number: payload.parentPhone || "",
            parent_name: guardianName,
            parent_phone: payload.parentPhone || "",
            activation_status: promoteToPending
              ? "pending"
              : row.activation_status,
          }
        : row
    );
  }

  function saveEdit(payload) {
    setError("");
    startTransition(async () => {
      const result = await updateActivatedStudent(payload);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      const section = sortedSections.find((s) => s.id === payload.sectionId);
      setPendingList((list) => applyEditedRow(list, payload, section));
      setActivatedList((list) => applyEditedRow(list, payload, section));
      setViewStudent((current) =>
        current?.id === payload.studentId
          ? applyEditedRow([current], payload, section)[0]
          : current
      );
      toast.success("Student details saved.");
      setEditStudent(null);
      setError("");
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleteStudent?.id) return;
    setError("");
    startTransition(async () => {
      const result = await deleteActivatedStudent(deleteStudent.id);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setActivatedList((list) =>
        list.filter((r) => r.id !== deleteStudent.id)
      );
      toast.success(
        result?.message ||
          "Student moved to Trash. Restore it anytime, or re-enroll the same LRN."
      );
      setDeleteStudent(null);
    });
  }

  return (
    <div className="space-y-4">
      {loadError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {loadError}
        </p>
      ) : null}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList
          variant="line"
          className="mb-4 h-auto w-full flex-wrap justify-start gap-1"
        >
          <TabsTrigger value="pending" className="px-3 py-2">
            Pending approvals
            {pendingList.length > 0 ? (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                {pendingList.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="activated" className="px-3 py-2">
            Activated
            <span className="ml-1.5 rounded-full bg-[#800000]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#800000]">
              {activatedList.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#800000]/10 bg-[#faf7f5]/80 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
                <UserCheck className="size-5" />
              </span>
              <div>
                <p className="font-heading text-sm font-bold text-[#3d1212]">
                  Pending approvals
                </p>
                <p className="text-xs text-muted-foreground">
                  Incomplete = missing parent contacts. Pending = details
                  complete — call the parent number, then Verify &amp; Approve.
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-[#800000]/20 bg-[#800000]/5 font-semibold text-[#800000]"
            >
              {pendingList.length} awaiting
            </Badge>
          </div>
          {error && !editStudent && !deleteStudent ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <PendingTable
            rows={pendingList}
            sections={sortedSections}
            pending={pending}
            onApprove={(id) => act(id, true)}
            onReturn={(id) => act(id, false)}
            onView={setViewStudent}
            onEdit={(row) => {
              setError("");
              setEditStudent(row);
            }}
          />
        </TabsContent>

        <TabsContent value="activated" className="space-y-4 rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#800000]/10 bg-[#faf7f5]/80 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
                <CheckCircle2 className="size-5" />
              </span>
              <div>
                <p className="font-heading text-sm font-bold text-[#3d1212]">
                  Activated students
                </p>
                <p className="text-xs text-muted-foreground">
                  View, edit, or remove activated learner records.
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-[#800000]/20 bg-[#800000]/5 font-semibold text-[#800000]"
            >
              {activatedList.length} activated
            </Badge>
          </div>
          <ActivatedTable
            rows={activatedList}
            sections={sortedSections}
            onView={setViewStudent}
            onEdit={(row) => {
              setError("");
              setEditStudent(row);
            }}
            onDelete={(row) => {
              setError("");
              setDeleteStudent(row);
            }}
          />
        </TabsContent>
      </Tabs>

      <StudentViewSheet
        student={viewStudent}
        open={Boolean(viewStudent)}
        onClose={() => setViewStudent(null)}
        onEdit={(row) => {
          setError("");
          setEditStudent(row);
        }}
      />

      <StudentEditSheet
        student={editStudent}
        sections={sortedSections}
        open={Boolean(editStudent)}
        pending={pending}
        error={error}
        onClose={() => {
          setEditStudent(null);
          setError("");
        }}
        onSubmit={saveEdit}
      />

      <SideSheet
        open={Boolean(deleteStudent)}
        onClose={() => {
          setDeleteStudent(null);
          setError("");
        }}
        closeLabel="Close move to trash"
        labelledBy="student-trash-title"
      >
        {deleteStudent ? (
          <>
            <StudentPanelHeader
              eyebrow="Move to Trash"
              student={deleteStudent}
              onClose={() => {
                setDeleteStudent(null);
                setError("");
              }}
              titleId="student-trash-title"
            />
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3">
              <PanelSection title="Confirm removal">
                <div className="space-y-2.5 text-sm text-muted-foreground">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldRead
                      label="Section"
                      value={sectionLabel(deleteStudent)}
                    />
                    <FieldRead
                      label="Status"
                      value={deleteStudent.activation_status || null}
                    />
                  </div>
                  <p className="rounded-lg border border-[#800000]/8 bg-white/70 px-2.5 py-2 text-xs leading-relaxed">
                    The learner leaves the active system and goes to Trash. The
                    LRN can be enrolled again, or you can restore this record
                    later. Grades and attendance stay with the record until
                    permanent delete.
                  </p>
                  {error ? (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {error}
                    </p>
                  ) : null}
                </div>
              </PanelSection>
            </div>
            <StudentPanelFooter>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setDeleteStudent(null);
                  setError("");
                }}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                disabled={pending}
                onClick={confirmDelete}
              >
                {pending ? "Moving…" : "Move to Trash"}
              </Button>
            </StudentPanelFooter>
          </>
        ) : null}
      </SideSheet>
    </div>
  );
}
