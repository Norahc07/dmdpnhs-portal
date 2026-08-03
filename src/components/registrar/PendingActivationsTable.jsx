"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  Eye,
  GraduationCap,
  MoreHorizontal,
  Pencil,
  Phone,
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
import { STATUS_BADGE_STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-9 text-sm";

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

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-3 last:border-b-0 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm break-words text-foreground">{value || "—"}</dd>
    </div>
  );
}

function SideSheet({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  description,
  children,
  closeLabel = "Close panel",
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
        aria-label={title}
        className={cn(
          "absolute inset-y-0 right-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl ring-1 ring-black/5 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="border-b bg-gradient-to-br from-[#800000]/10 to-transparent px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-[#800000] uppercase">
                {eyebrow}
              </p>
              <h2 className="mt-1 truncate text-lg font-semibold text-foreground">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
          {description ? (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </aside>
    </div>
  );
}

function StudentViewSheet({ student, open, onClose, onEdit }) {
  return (
    <SideSheet
      open={open}
      onClose={onClose}
      eyebrow="Student details"
      title={student ? studentFullName(student) : "Student"}
      subtitle={student?.lrn ? `LRN ${student.lrn}` : undefined}
      description="Full activation record for this learner."
      closeLabel="Close student details"
    >
      {student ? (
        <>
          <dl className="flex-1 overflow-y-auto px-5 py-2">
            <DetailRow label="Student name" value={studentFullName(student)} />
            <DetailRow label="LRN" value={student.lrn} />
            <DetailRow
              label="Contact"
              value={
                [student.contact_number, student.personal_email]
                  .filter(Boolean)
                  .join(" · ") || null
              }
            />
            <DetailRow label="Section" value={sectionLabel(student)} />
            <DetailRow
              label="Emergency contact"
              value={
                student.parent_name || student.parent_phone
                  ? `${student.parent_name || "Parent"} · ${student.parent_phone || "—"}`
                  : null
              }
            />
            <DetailRow
              label="Parent code"
              value={student.parent_access_code_shown}
            />
            <DetailRow label="Status" value={student.activation_status} />
          </dl>
          <div className="flex gap-2 border-t px-5 py-4">
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
          </div>
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
  const parentParts = splitParentName(student?.parent_name);
  const [firstName, setFirstName] = useState(
    student?.profiles?.first_name || ""
  );
  const [lastName, setLastName] = useState(student?.profiles?.last_name || "");
  const [contactNumber, setContactNumber] = useState(
    student?.contact_number || ""
  );
  const [personalEmail, setPersonalEmail] = useState(
    student?.personal_email || ""
  );
  const [sectionId, setSectionId] = useState(student?.section_id || "");
  const [parentFirstName, setParentFirstName] = useState(parentParts.first);
  const [parentLastName, setParentLastName] = useState(parentParts.last);
  const [parentPhone, setParentPhone] = useState(student?.parent_phone || "");

  useEffect(() => {
    if (!open || !student) return;
    const parts = splitParentName(student.parent_name);
    setFirstName(student.profiles?.first_name || "");
    setLastName(student.profiles?.last_name || "");
    setContactNumber(student.contact_number || "");
    setPersonalEmail(student.personal_email || "");
    setSectionId(student.section_id || "");
    setParentFirstName(parts.first);
    setParentLastName(parts.last);
    setParentPhone(student.parent_phone || "");
  }, [open, student]);

  return (
    <SideSheet
      open={open}
      onClose={onClose}
      eyebrow="Edit student"
      title={student ? studentFullName(student) : "Student"}
      subtitle={student?.lrn ? `LRN ${student.lrn}` : undefined}
      description="Update learner and emergency contact details."
      closeLabel="Close edit student"
    >
      {student ? (
        <form
          key={student.id}
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              studentId: student.id,
              firstName,
              lastName,
              contactNumber,
              personalEmail,
              sectionId: sectionId || null,
              parentFirstName,
              parentLastName,
              parentPhone,
            });
          }}
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>First name</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last name</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Contact number</Label>
              <Input
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="09XXXXXXXXX"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Personal email</Label>
              <Input
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Section</Label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className={selectClass}
              >
                <option value="">— Unassigned —</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    Grade {s.grade_level} · {s.section_name}
                    {s.school_year ? ` (${s.school_year})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-xl border border-[#800000]/10 bg-[#faf7f5] p-3.5 space-y-3">
              <p className="text-xs font-semibold tracking-wide text-[#800000] uppercase">
                Emergency contact (parent)
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Parent first name</Label>
                  <Input
                    value={parentFirstName}
                    onChange={(e) => setParentFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Parent last name</Label>
                  <Input
                    value={parentLastName}
                    onChange={(e) => setParentLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Parent phone</Label>
                <Input
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="09XXXXXXXXX"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Parent code:{" "}
                <span className="font-mono font-semibold text-[#3d1212]">
                  {student.parent_access_code_shown || "—"}
                </span>
              </p>
            </div>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          </div>
          <div className="flex gap-2 border-t px-5 py-4">
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
          </div>
        </form>
      ) : null}
    </SideSheet>
  );
}

function PendingTable({ rows, pending, onApprove, onReturn }) {
  const isEmpty = !rows.length;
  return (
    <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#800000]/3 hover:bg-[#800000]/3">
              <TableHead className="font-semibold text-[#3d1212]">
                Student name
              </TableHead>
              <TableHead className="font-semibold text-[#3d1212]">LRN</TableHead>
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
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-56 p-0">
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
                        {studentFullName(row)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.lrn}</TableCell>
                  <TableCell className="text-xs">
                    <div>{row.parent_name || "—"}</div>
                    <div className="inline-flex items-center gap-1 text-muted-foreground">
                      <Phone className="size-3 shrink-0" />
                      {row.parent_phone || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md bg-[#ffd700]/15 px-2 py-1 font-mono text-xs font-semibold text-[#3d1212]">
                      {row.parent_access_code_shown || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{sectionLabel(row)}</TableCell>
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
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ActivatedTable({ rows, onView, onEdit, onDelete }) {
  const isEmpty = !rows.length;
  return (
    <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#800000]/3 hover:bg-[#800000]/3">
              <TableHead className="font-semibold text-[#3d1212]">
                Student name
              </TableHead>
              <TableHead className="font-semibold text-[#3d1212]">LRN</TableHead>
              <TableHead className="font-semibold text-[#3d1212]">
                Section
              </TableHead>
              <TableHead className="font-semibold text-[#3d1212]">
                Status
              </TableHead>
              <TableHead className="w-12 text-right font-semibold text-[#3d1212]">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-56 p-0">
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-[#800000]/8 text-[#800000] ring-1 ring-[#800000]/10">
                      <Users className="size-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-heading text-base font-bold text-[#3d1212]">
                        No activated students yet
                      </p>
                      <p className="max-w-md text-sm text-muted-foreground">
                        Approved activations will show up here after you verify
                        pending requests.
                      </p>
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
                        {studentFullName(row)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.lrn}</TableCell>
                  <TableCell className="text-sm">{sectionLabel(row)}</TableCell>
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
    </div>
  );
}

export function PendingActivationsTable({
  pendingRows = [],
  activatedRows = [],
  sections = [],
  rows,
}) {
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
      setActivatedList((list) =>
        list.map((row) =>
          row.id === payload.studentId
            ? {
                ...row,
                contact_number: payload.contactNumber || null,
                personal_email: payload.personalEmail || null,
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
                parent_name: `${payload.parentFirstName || ""} ${payload.parentLastName || ""}`.trim(),
                parent_phone: payload.parentPhone || "",
              }
            : row
        )
      );
      toast.success("Student updated.");
      setEditStudent(null);
      setError("");
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
      toast.success("Student deleted.");
      setDeleteStudent(null);
    });
  }

  return (
    <div className="space-y-4">
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
                  Call the parent number to confirm it works, then Approve.
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
            pending={pending}
            onApprove={(id) => act(id, true)}
            onReturn={(id) => act(id, false)}
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
        eyebrow="Delete student"
        title={deleteStudent ? studentFullName(deleteStudent) : "Delete"}
        subtitle={deleteStudent?.lrn ? `LRN ${deleteStudent.lrn}` : undefined}
        description="This permanently removes the student account, activation record, and linked portal access. This cannot be undone."
        closeLabel="Close delete student"
      >
        <div className="flex flex-1 flex-col">
          <div className="flex-1 space-y-3 px-5 py-5 text-sm text-muted-foreground">
            <p>
              Section:{" "}
              <span className="text-foreground">
                {deleteStudent ? sectionLabel(deleteStudent) : "—"}
              </span>
            </p>
            {error ? <p className="text-rose-700">{error}</p> : null}
          </div>
          <div className="flex gap-2 border-t px-5 py-4">
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
              {pending ? "Deleting…" : "Delete student"}
            </Button>
          </div>
        </div>
      </SideSheet>
    </div>
  );
}
