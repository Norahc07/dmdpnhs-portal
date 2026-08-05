"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, ClipboardList, Plus, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  createDepartment,
  updateTeacherFacultyAssignment,
} from "@/actions/grade-workflow";
import {
  assignTeacher,
  createTeacherByRegistrar,
} from "@/actions/activation";
import { PendingTeachersTable } from "@/components/registrar/RegistrarPanels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DEPARTMENT_BAND_OPTIONS,
  FACULTY_POSITIONS,
  FACULTY_POSITION_LABELS,
} from "@/lib/grade-workflow";
import {
  isSeniorHighGrade,
  SCHOOL_YEAR_DEFAULT,
  STATUS_BADGE_STYLES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-9 text-sm";

function isJuniorHighGrade(grade) {
  const n = Number(grade);
  return n >= 7 && n <= 10;
}

function loadsForBand(loads, band) {
  return (loads || []).filter((item) => {
    const g = item?.gradeLevel;
    if (g == null || Number.isNaN(Number(g))) return false;
    return band === "shs" ? isSeniorHighGrade(g) : isJuniorHighGrade(g);
  });
}

/** Keeps column widths stable across Junior / Senior / Unassigned tabs. */
function FixedTable({ children, minWidth = "56rem", className }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <Table
        className={cn("table-fixed w-full", className)}
        style={{ minWidth }}
      >
        {children}
      </Table>
    </div>
  );
}

function TruncateCell({ children, className, title }) {
  const text =
    title ??
    (typeof children === "string" || typeof children === "number"
      ? String(children)
      : undefined);
  return (
    <TableCell className={cn("max-w-0 truncate", className)} title={text}>
      {children}
    </TableCell>
  );
}

const bandLabel = Object.fromEntries(
  DEPARTMENT_BAND_OPTIONS.map((b) => [b.value, b.label])
);

function gradesForBand(band) {
  return (
    DEPARTMENT_BAND_OPTIONS.find((b) => b.value === band)?.grades || []
  );
}

function bandFromGrade(grade) {
  if (grade == null || grade === "") return "jhs";
  return isSeniorHighGrade(grade) ? "shs" : "jhs";
}

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-[#3d1212]">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}

function BandSummaryCards({
  title,
  subtitle,
  departmentCount,
  teacherCount,
  assignmentCount,
  departments = [],
  teacherCountByDept = {},
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-heading text-base font-bold text-[#3d1212]">
          {title}
        </h3>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Building2}
          label="Total departments"
          value={departmentCount}
          hint="Departments in this band"
        />
        <StatCard
          icon={Users}
          label="Total teachers"
          value={teacherCount}
          hint="Assigned to a department here"
        />
        <StatCard
          icon={ClipboardList}
          label="Faculty assignments"
          value={assignmentCount}
          hint="Section · subject teaching loads"
        />
      </div>

      {departments.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-[#800000]/10 bg-[#faf7f5] px-3.5 py-3"
            >
              <p className="font-medium text-[#3d1212]">{d.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {d.grade_level != null ? `Grade ${d.grade_level}` : "All grades"}
                {" · "}
                {teacherCountByDept[d.id] || 0} teacher
                {(teacherCountByDept[d.id] || 0) === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-[#800000]/15 px-3 py-4 text-sm text-muted-foreground">
          No departments in this band yet.
        </p>
      )}
    </section>
  );
}

function SideSheet({
  open,
  onClose,
  title,
  subtitle,
  eyebrow,
  description,
  children,
  closeLabel = "Close faculty panel",
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

function AddDepartmentSheet({ open, pending, error, onClose, onSubmit }) {
  const [band, setBand] = useState("jhs");
  const [gradeLevel, setGradeLevel] = useState("7");
  const grades = gradesForBand(band);

  useEffect(() => {
    if (!open) return;
    setBand("jhs");
    setGradeLevel("7");
  }, [open]);

  useEffect(() => {
    if (!grades.map(String).includes(String(gradeLevel))) {
      setGradeLevel(String(grades[0] || ""));
    }
  }, [band, grades, gradeLevel]);

  return (
    <SideSheet
      open={open}
      onClose={onClose}
      eyebrow="Departments"
      title="Add department"
      description="Choose Junior High or Senior High, then the grade level this department covers."
      closeLabel="Close add department"
    >
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="dept-name">Department name</Label>
            <Input
              id="dept-name"
              name="name"
              required
              placeholder="e.g. English"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dept-band">Level band</Label>
            <select
              id="dept-band"
              name="band"
              value={band}
              onChange={(e) => setBand(e.target.value)}
              className={selectClass}
              required
            >
              {DEPARTMENT_BAND_OPTIONS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dept-grade">Grade level</Label>
            <select
              id="dept-grade"
              name="gradeLevel"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className={selectClass}
              required
            >
              {grades.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {band === "jhs"
                ? "Junior High: Grades 7–10"
                : "Senior High: Grades 11–12"}
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
            {pending ? "Saving…" : "Create department"}
          </Button>
        </div>
      </form>
    </SideSheet>
  );
}

function FacultyAssignSheet({
  teacher,
  subjects,
  sections = [],
  currentLoads = [],
  mode = "assign", // assign | update
  lockedBand = null, // jhs | shs | null
  open,
  pending,
  error,
  onClose,
  onSubmit,
}) {
  const isUpdate = mode === "update";
  const initialBand =
    lockedBand || bandFromGrade(teacher?.departments?.grade_level);
  const initialGrade = String(
    teacher?.departments?.grade_level ||
      (initialBand === "shs" ? 11 : 7)
  );

  const [band, setBand] = useState(initialBand);
  const [gradeLevel, setGradeLevel] = useState(initialGrade);
  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [loadSubjectId, setLoadSubjectId] = useState("");

  const grades = gradesForBand(band);
  const bandLocked = Boolean(lockedBand);

  const subjectOptions = useMemo(() => {
    const grade = Number(gradeLevel);
    return (subjects || [])
      .filter((s) => Number(s.grade_level) === grade)
      .sort((a, b) => {
        const byName = String(a.subject_name).localeCompare(
          String(b.subject_name)
        );
        if (byName !== 0) return byName;
        return String(a.track_strand || "").localeCompare(
          String(b.track_strand || "")
        );
      });
  }, [subjects, gradeLevel]);

  const sectionOptions = useMemo(() => {
    return (sections || [])
      .filter((s) => {
        const g = Number(s.grade_level);
        return band === "shs" ? isSeniorHighGrade(g) : isJuniorHighGrade(g);
      })
      .sort((a, b) => {
        if (Number(a.grade_level) !== Number(b.grade_level)) {
          return Number(a.grade_level) - Number(b.grade_level);
        }
        return String(a.section_name).localeCompare(String(b.section_name));
      });
  }, [sections, band]);

  const loadSubjectOptions = useMemo(() => {
    const section = sectionOptions.find((s) => String(s.id) === String(sectionId));
    const grade = section ? Number(section.grade_level) : null;
    return (subjects || [])
      .filter((s) => (grade == null ? true : Number(s.grade_level) === grade))
      .filter((s) => {
        const g = Number(s.grade_level);
        return band === "shs" ? isSeniorHighGrade(g) : isJuniorHighGrade(g);
      })
      .sort((a, b) =>
        String(a.subject_name).localeCompare(String(b.subject_name))
      );
  }, [subjects, sectionId, sectionOptions, band]);

  useEffect(() => {
    if (!open || !teacher) return;
    const nextBand =
      lockedBand || bandFromGrade(teacher.departments?.grade_level);
    const nextGrade = String(
      teacher.departments?.grade_level || (nextBand === "shs" ? 11 : 7)
    );
    setBand(nextBand);
    setGradeLevel(nextGrade);
    setSectionId("");
    setLoadSubjectId("");

    const match = (subjects || []).find(
      (s) =>
        Number(s.grade_level) === Number(nextGrade) &&
        (s.department_id === teacher.department_id ||
          s.subject_name === teacher.departments?.name ||
          s.subject_name === teacher.faculty_dept)
    );
    setSubjectId(match?.id || "");
  }, [open, teacher, subjects, lockedBand]);

  useEffect(() => {
    if (!grades.map(String).includes(String(gradeLevel))) {
      setGradeLevel(String(grades[0] || ""));
    }
  }, [band, grades, gradeLevel]);

  useEffect(() => {
    if (
      subjectId &&
      !subjectOptions.some((s) => String(s.id) === String(subjectId))
    ) {
      setSubjectId("");
    }
  }, [subjectOptions, subjectId]);

  useEffect(() => {
    if (
      loadSubjectId &&
      !loadSubjectOptions.some((s) => String(s.id) === String(loadSubjectId))
    ) {
      setLoadSubjectId("");
    }
  }, [loadSubjectOptions, loadSubjectId]);

  return (
    <SideSheet
      open={open}
      onClose={onClose}
      eyebrow={isUpdate ? "Update faculty" : "Assign faculty"}
      title={
        teacher
          ? `${teacher.profiles?.first_name || ""} ${teacher.profiles?.last_name || ""}`.trim()
          : "Teacher"
      }
      subtitle={teacher?.teacher_id || "—"}
      description={
        isUpdate
          ? "Update department and position, and add another section/subject load for this level."
          : "Set subject department and position, then optionally assign the first section/subject load."
      }
      closeLabel="Close faculty assignment"
    >
      {teacher ? (
        <form
          key={`${teacher.id}-${mode}-${lockedBand || "any"}`}
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={onSubmit}
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="assign-band">Level band</Label>
              <select
                id="assign-band"
                name={bandLocked ? undefined : "band"}
                value={band}
                onChange={(e) => setBand(e.target.value)}
                className={selectClass}
                required
                disabled={bandLocked}
              >
                {DEPARTMENT_BAND_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
              {bandLocked ? (
                <>
                  <input type="hidden" name="band" value={band} />
                  <p className="text-xs text-muted-foreground">
                    Locked to this tab — only{" "}
                    {band === "shs" ? "Senior High" : "Junior High"} sections can
                    be managed here.
                  </p>
                </>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign-grade">Grade level (department)</Label>
              <select
                id="assign-grade"
                name="gradeLevel"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className={selectClass}
                required
              >
                {grades.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign-subject">Department</Label>
              <select
                id="assign-subject"
                name="subjectId"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className={selectClass}
                required
              >
                <option value="">— Select subject —</option>
                {subjectOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject_name}
                    {s.track_strand ? ` · ${s.track_strand}` : ""}
                  </option>
                ))}
              </select>
              {subjectOptions.length === 0 ? (
                <p className="text-xs text-amber-700">
                  No subjects found for Grade {gradeLevel}. Add subjects under
                  Academics first.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Subject departments for Grade {gradeLevel} (e.g. TLE,
                  English).
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign-position">Position</Label>
              <select
                id="assign-position"
                name="facultyPosition"
                defaultValue={teacher.faculty_position || "teacher"}
                className={selectClass}
              >
                {FACULTY_POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {isUpdate && currentLoads.length > 0 ? (
              <div className="rounded-xl border border-[#800000]/10 bg-[#faf7f5] px-3.5 py-3">
                <p className="text-xs font-semibold tracking-wide text-[#800000] uppercase">
                  Current {band === "shs" ? "Senior High" : "Junior High"} loads
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                  {currentLoads.map((item) => (
                    <li key={item.key || item.id}>
                      <span className="text-foreground/80">{item.label}</span>
                      {item.subject ? (
                        <span className="block text-[11px]">{item.subject}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-3 rounded-xl border border-dashed border-[#800000]/20 p-3.5">
              <div>
                <p className="text-sm font-medium text-[#3d1212]">
                  {isUpdate
                    ? "Add section / subject"
                    : "Assign section / subject (optional)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Only {band === "shs" ? "Grades 11–12" : "Grades 7–10"}{" "}
                  sections appear here.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assign-section">Section</Label>
                <select
                  id="assign-section"
                  name="sectionId"
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className={selectClass}
                >
                  <option value="">
                    {isUpdate ? "— Select section to add —" : "— Assign later —"}
                  </option>
                  {sectionOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      Grade {s.grade_level} · {s.section_name}
                      {s.track_strand ? ` · ${s.track_strand}` : ""} (
                      {s.school_year})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assign-load-subject">Subject for section</Label>
                <select
                  id="assign-load-subject"
                  name="loadSubjectId"
                  value={loadSubjectId}
                  onChange={(e) => setLoadSubjectId(e.target.value)}
                  className={selectClass}
                  disabled={!sectionId}
                  required={Boolean(sectionId)}
                >
                  <option value="">— Select subject —</option>
                  {loadSubjectOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subject_name}
                      {s.track_strand ? ` · ${s.track_strand}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="hidden"
                name="schoolYear"
                value={SCHOOL_YEAR_DEFAULT}
              />
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
              disabled={pending || !subjectId}
              className="flex-1 bg-[#800000] hover:bg-[#6a0000]"
            >
              {pending
                ? "Saving…"
                : isUpdate
                  ? "Save updates"
                  : "Save assignment"}
            </Button>
          </div>
        </form>
      ) : null}
    </SideSheet>
  );
}

function TeachersTable({
  rows,
  assignmentsByTeacher,
  emptyMessage,
  onAssign,
  loadBand = null, // jhs | shs | null (show all loads)
  actionLabel = "Assign",
  showActions = true,
}) {
  const colCount = showActions ? 7 : 6;
  return (
    <FixedTable minWidth={showActions ? "56rem" : "50rem"}>
      <colgroup>
        <col className="w-[7.5rem]" />
        <col className="w-[12rem]" />
        <col className="w-[11rem]" />
        <col className="w-[9.5rem]" />
        <col className="w-[6.5rem]" />
        <col />
        {showActions ? <col className="w-[6.5rem]" /> : null}
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead>Teacher ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Position</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Sections / subjects</TableHead>
          {showActions ? (
            <TableHead className="text-right">Actions</TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={colCount} className="text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
        {rows.map((t) => {
          const allLoads = assignmentsByTeacher[t.id] || [];
          const assignments = loadBand
            ? loadsForBand(allLoads, loadBand)
            : allLoads;
          const fullName =
            `${t.profiles?.first_name || ""} ${t.profiles?.last_name || ""}`.trim();
          const deptName = t.departments?.name || t.faculty_dept || "—";
          const positionLabel =
            FACULTY_POSITION_LABELS[t.faculty_position] || "Regular teacher";
          return (
            <TableRow key={t.id}>
              <TruncateCell
                className="font-mono text-xs font-semibold"
                title={t.teacher_id}
              >
                {t.teacher_id}
              </TruncateCell>
              <TruncateCell title={fullName}>{fullName || "—"}</TruncateCell>
              <TableCell className="max-w-0">
                <span className="block truncate" title={deptName}>
                  {deptName}
                </span>
                {t.departments?.band ? (
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {bandLabel[t.departments.band] || t.departments.band}
                  </span>
                ) : null}
              </TableCell>
              <TruncateCell title={positionLabel}>{positionLabel}</TruncateCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={STATUS_BADGE_STYLES[t.profiles?.status] || ""}
                >
                  {t.profiles?.status}
                </Badge>
              </TableCell>
              <TableCell className="align-top text-xs text-muted-foreground">
                {assignments.length === 0 ? (
                  "No assignments"
                ) : (
                  <ul className="flex max-w-full flex-col gap-1.5">
                    {assignments.map((item, idx) => {
                      const label =
                        typeof item === "string" ? item : item.label;
                      const subject =
                        typeof item === "string" ? null : item.subject;
                      const key =
                        typeof item === "string"
                          ? `${t.id}-${idx}`
                          : item.key || `${t.id}-${idx}`;
                      return (
                        <li key={key} className="min-w-0 leading-snug">
                          <span
                            className="block truncate text-foreground/80"
                            title={label}
                          >
                            {label}
                          </span>
                          {subject ? (
                            <span
                              className="block truncate text-[11px] text-muted-foreground"
                              title={subject}
                            >
                              {subject}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </TableCell>
              {showActions ? (
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-[#800000]/20 text-[#800000]"
                    onClick={() => onAssign?.(t)}
                  >
                    {actionLabel}
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </FixedTable>
  );
}

export function FacultyDirectory({
  teachers = [],
  departments = [],
  subjects = [],
  sections = [],
  assignmentsByTeacher = {},
  pendingTeachers = [],
}) {
  const router = useRouter();
  const [deptList, setDeptList] = useState(departments);
  const [rows, setRows] = useState(teachers);
  const [loadsByTeacher, setLoadsByTeacher] = useState(assignmentsByTeacher);
  const [selected, setSelected] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [deptSheetOpen, setDeptSheetOpen] = useState(false);
  const [assignmentBand, setAssignmentBand] = useState("jhs"); // jhs | shs | unassigned
  const [assignDeptFilter, setAssignDeptFilter] = useState("all");
  const [assignPositionFilter, setAssignPositionFilter] = useState("all");
  const [assignSearch, setAssignSearch] = useState("");
  const [approvedDeptFilter, setApprovedDeptFilter] = useState("all");
  const [approvedPositionFilter, setApprovedPositionFilter] = useState("all");
  const [approvedSearch, setApprovedSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [addTeacherOpen, setAddTeacherOpen] = useState(false);
  const [addTeacherError, setAddTeacherError] = useState("");
  const [createdTeacherCreds, setCreatedTeacherCreds] = useState(null);

  useEffect(() => {
    setDeptList(departments);
  }, [departments]);

  // Keep Approved + Faculty assignments in sync with server, without wiping
  // fresher optimistic load rows before revalidation catches up.
  useEffect(() => {
    setRows(teachers);
  }, [teachers]);

  useEffect(() => {
    setLoadsByTeacher((prev) => {
      const next = { ...assignmentsByTeacher };
      for (const [teacherId, localLoads] of Object.entries(prev || {})) {
        const serverLoads = next[teacherId] || [];
        if ((localLoads?.length || 0) > serverLoads.length) {
          next[teacherId] = localLoads;
        }
      }
      return next;
    });
  }, [assignmentsByTeacher]);

  function patchApprovedTeacher(teacherId, teacherPatch, loadEntry = null) {
    setRows((list) =>
      list.map((t) =>
        t.id === teacherId
          ? {
              ...t,
              ...teacherPatch,
            }
          : t
      )
    );
    if (loadEntry) {
      setLoadsByTeacher((map) => {
        const existing = map[teacherId] || [];
        const duplicate = existing.some(
          (item) =>
            String(item.sectionId) === String(loadEntry.sectionId) &&
            String(item.subjectId) === String(loadEntry.subjectId) &&
            String(item.schoolYear || "") === String(loadEntry.schoolYear || "")
        );
        if (duplicate) return map;
        return {
          ...map,
          [teacherId]: [...existing, loadEntry],
        };
      });
    }
  }

  const approvedRows = useMemo(
    () =>
      rows.filter(
        (t) =>
          t.profiles?.status === "active" ||
          (t.profiles?.status && t.profiles.status !== "pending")
      ),
    [rows]
  );

  const approvedDeptOptions = useMemo(
    () =>
      [...deptList].sort((a, b) =>
        String(a.name).localeCompare(String(b.name))
      ),
    [deptList]
  );

  const filteredApprovedRows = useMemo(() => {
    const q = approvedSearch.trim().toLowerCase();
    return approvedRows.filter((t) => {
      if (approvedDeptFilter !== "all") {
        const deptId = t.department_id || t.departments?.id;
        const deptName = (
          t.departments?.name ||
          t.faculty_dept ||
          ""
        ).toLowerCase();
        const matchId = String(deptId) === String(approvedDeptFilter);
        const opt = approvedDeptOptions.find(
          (d) => String(d.id) === String(approvedDeptFilter)
        );
        const matchName =
          opt?.name && deptName === String(opt.name).toLowerCase();
        if (!matchId && !matchName) return false;
      }

      if (approvedPositionFilter !== "all") {
        const pos = t.faculty_position || "teacher";
        if (pos !== approvedPositionFilter) return false;
      }

      if (q) {
        const hay = `${t.profiles?.first_name || ""} ${t.profiles?.last_name || ""} ${t.teacher_id || ""} ${t.departments?.name || ""} ${t.faculty_dept || ""} ${t.profiles?.email || ""}`;
        if (!hay.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [
    approvedRows,
    approvedDeptFilter,
    approvedPositionFilter,
    approvedSearch,
    approvedDeptOptions,
  ]);

  const teacherCountByDept = useMemo(() => {
    const map = {};
    for (const t of rows) {
      const id = t.department_id;
      if (!id) continue;
      map[id] = (map[id] || 0) + 1;
    }
    return map;
  }, [rows]);

  const bandStats = useMemo(() => {
    function statsFor(band) {
      const bandDepts = deptList
        .filter((d) => d.band === band)
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
      const deptIds = new Set(bandDepts.map((d) => d.id));
      const teachers = rows.filter((t) => {
        if (t.departments?.band === band) return true;
        if (t.department_id && deptIds.has(t.department_id)) return true;
        return false;
      });
      const assignmentCount = teachers.reduce(
        (sum, t) => sum + (loadsByTeacher[t.id] || []).length,
        0
      );
      return {
        departments: bandDepts,
        departmentCount: bandDepts.length,
        teacherCount: teachers.length,
        assignmentCount,
      };
    }
    return { jhs: statsFor("jhs"), shs: statsFor("shs") };
  }, [deptList, rows, loadsByTeacher]);

  const assignmentTabRows = useMemo(() => {
    const jhs = [];
    const shs = [];
    const unassigned = [];

    // Only approved teachers flow into Faculty assignments
    for (const t of approvedRows) {
      const loads = loadsByTeacher[t.id] || [];
      if (loads.length === 0) {
        unassigned.push(t);
        continue;
      }

      const jhsLoads = loadsForBand(loads, "jhs");
      const shsLoads = loadsForBand(loads, "shs");
      if (jhsLoads.length > 0) jhs.push(t);
      if (shsLoads.length > 0) shs.push(t);
    }

    return { jhs, shs, unassigned };
  }, [approvedRows, loadsByTeacher]);

  const assignDeptOptions = useMemo(() => {
    if (assignmentBand === "jhs") return bandStats.jhs.departments;
    if (assignmentBand === "shs") return bandStats.shs.departments;
    // Unassigned: any subject department a listed teacher may already belong to
    return [...bandStats.jhs.departments, ...bandStats.shs.departments].sort(
      (a, b) => String(a.name).localeCompare(String(b.name))
    );
  }, [assignmentBand, bandStats]);

  const filteredAssignmentRows = useMemo(() => {
    const base = assignmentTabRows[assignmentBand] || [];
    const q = assignSearch.trim().toLowerCase();

    return base.filter((t) => {
      if (assignDeptFilter !== "all") {
        const deptId = t.department_id || t.departments?.id;
        const deptName = (
          t.departments?.name ||
          t.faculty_dept ||
          ""
        ).toLowerCase();
        const matchId = String(deptId) === String(assignDeptFilter);
        const opt = assignDeptOptions.find(
          (d) => String(d.id) === String(assignDeptFilter)
        );
        const matchName =
          opt?.name && deptName === String(opt.name).toLowerCase();
        if (!matchId && !matchName) return false;
      }

      if (assignPositionFilter !== "all") {
        const pos = t.faculty_position || "teacher";
        if (pos !== assignPositionFilter) return false;
      }

      if (q) {
        const hay = `${t.profiles?.first_name || ""} ${t.profiles?.last_name || ""} ${t.teacher_id || ""} ${t.departments?.name || ""} ${t.faculty_dept || ""}`;
        if (!hay.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [
    assignmentTabRows,
    assignmentBand,
    assignDeptFilter,
    assignPositionFilter,
    assignSearch,
    assignDeptOptions,
  ]);

  function switchAssignmentBand(next) {
    setAssignmentBand(next);
    setAssignDeptFilter("all");
    setAssignPositionFilter("all");
    setAssignSearch("");
  }

  function openAssign(teacher) {
    setSelected(teacher);
    setError("");
    setAssignOpen(true);
  }

  function closeAssign() {
    setAssignOpen(false);
    setSelected(null);
    setError("");
  }

  function saveAssign(e) {
    e.preventDefault();
    if (!selected) return;
    setError("");
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const mode = assignmentBand === "unassigned" ? "assign" : "update";
    startTransition(async () => {
      const result = await updateTeacherFacultyAssignment({
        teacherId: selected.id,
        subjectId: fd.subjectId,
        band: fd.band,
        gradeLevel: fd.gradeLevel,
        facultyPosition: fd.facultyPosition,
      });
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      const subject = subjects.find((s) => s.id === fd.subjectId);
      const dept =
        deptList.find((d) => d.id === result.departmentId) ||
        (result.departmentId
          ? {
              id: result.departmentId,
              name: result.subjectName || subject?.subject_name,
              band: fd.band,
              grade_level: Number(fd.gradeLevel),
            }
          : null);

      if (dept && !deptList.some((d) => d.id === dept.id)) {
        setDeptList((list) => [...list, dept]);
      }

      let loadEntry = null;
      if (fd.sectionId && fd.loadSubjectId) {
        const loadResult = await assignTeacher({
          teacherId: selected.id,
          sectionId: fd.sectionId,
          subjectId: fd.loadSubjectId,
          schoolYear: fd.schoolYear || SCHOOL_YEAR_DEFAULT,
        });
        if (loadResult?.error) {
          setError(loadResult.error);
          toast.error(loadResult.error);
          return;
        }

        const section = sections.find(
          (s) => String(s.id) === String(fd.sectionId)
        );
        const loadSubject = subjects.find(
          (s) => String(s.id) === String(fd.loadSubjectId)
        );
        const grade = section?.grade_level;
        const schoolYear = fd.schoolYear || SCHOOL_YEAR_DEFAULT;
        loadEntry = {
          id: `temp-${Date.now()}`,
          key: `temp-${selected.id}-${fd.sectionId}-${fd.loadSubjectId}`,
          label: `Grade ${grade} · ${section?.section_name || "—"} (${schoolYear})`,
          subject: loadSubject?.subject_name || null,
          gradeLevel: grade != null ? Number(grade) : null,
          sectionId: fd.sectionId,
          subjectId: fd.loadSubjectId,
          schoolYear,
        };
      }

      // Shared state: Approved table + Faculty assignments tabs stay in sync
      patchApprovedTeacher(
        selected.id,
        {
          department_id: result.departmentId || null,
          faculty_position: fd.facultyPosition,
          faculty_dept: result.subjectName || null,
          departments: dept,
        },
        loadEntry
      );

      toast.success(
        mode === "update"
          ? "Faculty details updated."
          : "Faculty assignment saved."
      );
      closeAssign();
      router.refresh();
    });
  }

  function saveDepartment(e) {
    e.preventDefault();
    setError("");
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    startTransition(async () => {
      const result = await createDepartment(fd);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Department created.");
      setDeptSheetOpen(false);
      if (result.department) {
        setDeptList((list) => [...list, result.department]);
      } else {
        setDeptList((list) => [
          ...list,
          {
            id: `temp-${Date.now()}`,
            name: fd.name,
            band: fd.band,
            grade_level: Number(fd.gradeLevel),
            description: null,
          },
        ]);
      }
    });
  }

  function submitAddTeacher(formData) {
    setAddTeacherError("");
    setCreatedTeacherCreds(null);
    startTransition(async () => {
      const result = await createTeacherByRegistrar(
        Object.fromEntries(formData)
      );
      if (result?.error) {
        setAddTeacherError(result.error);
        toast.error(result.error);
        return;
      }
      setCreatedTeacherCreds({
        teacherId: result.teacherId,
        email: result.email,
        temporaryPassword: result.temporaryPassword,
      });
      toast.success(result.message || "Teacher created.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="rounded-2xl border border-[#800000]/10 bg-white px-4 py-3 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.28)] sm:max-w-xl">
          <p className="text-sm font-semibold text-[#3d1212]">
            Add faculty accounts
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Create a teacher so they can sign in immediately with email or
            Teacher ID. Self-registered teachers still appear under Pending
            approvals.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setAddTeacherError("");
            setCreatedTeacherCreds(null);
            setAddTeacherOpen(true);
          }}
          className="bg-[#800000] hover:bg-[#6a0000]"
        >
          <UserPlus className="size-4" />
          Add teacher
        </Button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList
          variant="line"
          className="mb-4 h-auto w-full flex-wrap justify-start gap-1"
        >
          <TabsTrigger value="pending" className="px-3 py-2">
            Pending approvals
            {pendingTeachers.length > 0 ? (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                {pendingTeachers.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="approved" className="px-3 py-2">
            Approved
            <span className="ml-1.5 rounded-full bg-[#800000]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#800000]">
              {approvedRows.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="departments" className="px-3 py-2">
            Departments
            <span className="ml-1.5 rounded-full bg-[#800000]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#800000]">
              {deptList.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="assignments" className="px-3 py-2">
            Faculty assignments
            <span className="ml-1.5 rounded-full bg-[#800000]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#800000]">
              {assignmentTabRows.jhs.length +
                assignmentTabRows.shs.length +
                assignmentTabRows.unassigned.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <PendingTeachersTable teachers={pendingTeachers} />
        </TabsContent>

        <TabsContent
          value="approved"
          className="space-y-4 rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]"
        >
          <p className="text-sm text-muted-foreground">
            Approved faculty in the system. Department, position, and
            section/subject details stay in sync when you Assign or Update under
            Faculty assignments.
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <SearchInput
              value={approvedSearch}
              onChange={(e) => setApprovedSearch(e.target.value)}
              placeholder="Search name or Teacher ID…"
              className="w-full min-w-[14rem] sm:w-64"
              aria-label="Search approved faculty"
            />
            <div className="space-y-1">
              <Label className="text-xs">Department</Label>
              <select
                value={approvedDeptFilter}
                onChange={(e) => setApprovedDeptFilter(e.target.value)}
                className={cn(selectClass, "min-w-[11rem]")}
              >
                <option value="all">All departments</option>
                {approvedDeptOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.band ? ` · ${bandLabel[d.band] || d.band}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Position</Label>
              <select
                value={approvedPositionFilter}
                onChange={(e) => setApprovedPositionFilter(e.target.value)}
                className={cn(selectClass, "min-w-[11rem]")}
              >
                <option value="all">All positions</option>
                {FACULTY_POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Showing {filteredApprovedRows.length}
            {filteredApprovedRows.length !== approvedRows.length
              ? ` of ${approvedRows.length}`
              : ""}{" "}
            approved faculty
          </p>

          <TeachersTable
            rows={filteredApprovedRows}
            assignmentsByTeacher={loadsByTeacher}
            emptyMessage={
              approvedSearch.trim() ||
              approvedDeptFilter !== "all" ||
              approvedPositionFilter !== "all"
                ? "No approved faculty match your filters."
                : "No approved teachers yet."
            }
            showActions={false}
          />
        </TabsContent>

        <TabsContent
          value="departments"
          className="space-y-6 rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Manage departments by Junior High and Senior High level bands.
            </p>
            <Button
              type="button"
              variant="outline"
              className="border-[#800000]/20 text-[#800000]"
              onClick={() => {
                setError("");
                setDeptSheetOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add department
            </Button>
          </div>

          {deptList.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#800000]/20 bg-[#faf7f5] px-6 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-[#800000]/8 text-[#800000]">
                <Building2 className="size-6" />
              </span>
              <p className="font-medium text-[#3d1212]">No departments yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Re-run{" "}
                <code className="text-xs">
                  supabase/seed-jhs-faculty-subjects-2025-2026.sql
                </code>{" "}
                if seed data is missing, or add a department here.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <BandSummaryCards
                title="Junior High"
                subtitle="Grades 7–10"
                departmentCount={bandStats.jhs.departmentCount}
                teacherCount={bandStats.jhs.teacherCount}
                assignmentCount={bandStats.jhs.assignmentCount}
                departments={bandStats.jhs.departments}
                teacherCountByDept={teacherCountByDept}
              />
              <div className="border-t border-[#800000]/10" />
              <BandSummaryCards
                title="Senior High"
                subtitle="Grades 11–12"
                departmentCount={bandStats.shs.departmentCount}
                teacherCount={bandStats.shs.teacherCount}
                assignmentCount={bandStats.shs.assignmentCount}
                departments={bandStats.shs.departments}
                teacherCountByDept={teacherCountByDept}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="assignments"
          className="space-y-4 rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]"
        >
          <p className="text-sm text-muted-foreground">
            Junior High and Senior High show only matching section/subject
            loads. Unassigned teachers have no section or subject yet — use
            Assign there. Use Update to edit details or add another load.
          </p>

          <div className="flex flex-wrap gap-1 border-b border-[#800000]/15">
            {[
              {
                key: "jhs",
                label: "Junior High",
                hint: "Grades 7–10 loads only",
                count: assignmentTabRows.jhs.length,
              },
              {
                key: "shs",
                label: "Senior High",
                hint: "Grades 11–12 loads only",
                count: assignmentTabRows.shs.length,
              },
              {
                key: "unassigned",
                label: "Unassigned",
                hint: "No section / subject",
                count: assignmentTabRows.unassigned.length,
              },
            ].map((tab) => {
              const active = assignmentBand === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => switchAssignmentBand(tab.key)}
                  className={cn(
                    "relative -mb-px inline-flex items-center gap-1.5 border-b-[3px] px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "border-[#800000] font-bold text-[#800000]"
                      : "border-transparent font-medium text-muted-foreground hover:border-[#800000]/30 hover:text-[#5c2a2a]"
                  )}
                >
                  <span className="flex flex-col items-start leading-tight sm:flex-row sm:items-center sm:gap-1.5">
                    <span>{tab.label}</span>
                    <span className="hidden text-[11px] font-normal text-muted-foreground sm:inline">
                      · {tab.hint}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                      active
                        ? "bg-[#800000]/10 text-[#800000] ring-1 ring-[#800000]/12"
                        : "bg-muted font-semibold text-muted-foreground"
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <SearchInput
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
              placeholder="Search name or Teacher ID…"
              className="w-full min-w-[14rem] sm:w-64"
              aria-label="Search faculty"
            />
            <div className="space-y-1">
              <Label className="text-xs">Department</Label>
              <select
                value={assignDeptFilter}
                onChange={(e) => setAssignDeptFilter(e.target.value)}
                className={cn(selectClass, "min-w-[11rem]")}
              >
                <option value="all">All departments</option>
                {assignDeptOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Position</Label>
              <select
                value={assignPositionFilter}
                onChange={(e) => setAssignPositionFilter(e.target.value)}
                className={cn(selectClass, "min-w-[11rem]")}
              >
                <option value="all">All positions</option>
                {FACULTY_POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {assignmentBand === "jhs"
                ? "Junior High only — Grades 7–10 section/subject loads"
                : assignmentBand === "shs"
                  ? "Senior High only — Grades 11–12 section/subject loads"
                  : "No section or subject teaching load yet"}
              {" · "}
              {filteredAssignmentRows.length}
              {filteredAssignmentRows.length !==
              (assignmentTabRows[assignmentBand] || []).length
                ? ` of ${(assignmentTabRows[assignmentBand] || []).length}`
                : ""}{" "}
              faculty
            </p>
            <TeachersTable
              rows={filteredAssignmentRows}
              assignmentsByTeacher={loadsByTeacher}
              loadBand={
                assignmentBand === "unassigned" ? null : assignmentBand
              }
              actionLabel={
                assignmentBand === "unassigned" ? "Assign" : "Update"
              }
              emptyMessage={
                assignmentBand === "unassigned"
                  ? assignSearch.trim() ||
                    assignDeptFilter !== "all" ||
                    assignPositionFilter !== "all"
                    ? "No unassigned faculty match your filters."
                    : "All teachers have a section/subject assignment."
                  : assignSearch.trim() ||
                      assignDeptFilter !== "all" ||
                      assignPositionFilter !== "all"
                    ? `No ${assignmentBand === "shs" ? "Senior High" : "Junior High"} faculty match your filters.`
                    : `No ${assignmentBand === "shs" ? "Senior High" : "Junior High"} faculty with matching section/subject loads yet.`
              }
              onAssign={openAssign}
            />
          </div>
        </TabsContent>
      </Tabs>

      <FacultyAssignSheet
        teacher={selected}
        subjects={subjects}
        sections={sections}
        currentLoads={
          selected &&
          (assignmentBand === "jhs" || assignmentBand === "shs")
            ? loadsForBand(loadsByTeacher[selected.id] || [], assignmentBand)
            : loadsByTeacher[selected?.id] || []
        }
        mode={assignmentBand === "unassigned" ? "assign" : "update"}
        lockedBand={
          assignmentBand === "jhs" || assignmentBand === "shs"
            ? assignmentBand
            : null
        }
        open={assignOpen}
        pending={pending}
        error={error}
        onClose={closeAssign}
        onSubmit={saveAssign}
      />

      <AddDepartmentSheet
        open={deptSheetOpen}
        pending={pending}
        error={error}
        onClose={() => {
          setDeptSheetOpen(false);
          setError("");
        }}
        onSubmit={saveDepartment}
      />

      <Dialog
        open={addTeacherOpen}
        onOpenChange={(open) => {
          setAddTeacherOpen(open);
          if (!open) {
            setAddTeacherError("");
            setCreatedTeacherCreds(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add teacher</DialogTitle>
            <DialogDescription>
              Creates an active faculty account. Share the Teacher ID / email
              and temporary password so they can sign in at /login/teacher.
            </DialogDescription>
          </DialogHeader>

          {createdTeacherCreds ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-950">
                <p className="font-semibold">Teacher created</p>
                <p className="mt-2 font-mono text-xs">
                  Teacher ID: {createdTeacherCreds.teacherId}
                </p>
                <p className="font-mono text-xs">
                  Email: {createdTeacherCreds.email}
                </p>
                <p className="font-mono text-xs">
                  Temp password: {createdTeacherCreds.temporaryPassword}
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  className="bg-[#800000] hover:bg-[#6a0000]"
                  onClick={() => {
                    setAddTeacherOpen(false);
                    setCreatedTeacherCreds(null);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                submitAddTeacher(new FormData(e.currentTarget));
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="teacher-first">First name</Label>
                <Input id="teacher-first" name="firstName" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="teacher-last">Last name</Label>
                <Input id="teacher-last" name="lastName" required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="teacher-email">Email</Label>
                <Input
                  id="teacher-email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@dmdpnhs.edu.ph"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="teacher-dept">Department</Label>
                <select
                  id="teacher-dept"
                  name="departmentId"
                  defaultValue=""
                  className={selectClass}
                >
                  <option value="">— Optional —</option>
                  {deptList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                      {d.band ? ` · ${bandLabel[d.band] || d.band}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="teacher-position">Position</Label>
                <select
                  id="teacher-position"
                  name="facultyPosition"
                  defaultValue="teacher"
                  className={selectClass}
                >
                  {FACULTY_POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="teacher-password">
                  Temporary password (optional)
                </Label>
                <Input
                  id="teacher-password"
                  name="password"
                  type="text"
                  minLength={8}
                  placeholder="Leave blank to auto-generate"
                />
                <p className="text-[11px] text-muted-foreground">
                  Minimum 8 characters if you set one. Otherwise a secure temp
                  password is generated.
                </p>
              </div>
              {addTeacherError ? (
                <p className="text-sm text-rose-700 sm:col-span-2">
                  {addTeacherError}
                </p>
              ) : null}
              <DialogFooter className="sm:col-span-2">
                <DialogClose
                  render={<Button type="button" variant="outline" />}
                >
                  Cancel
                </DialogClose>
                <Button
                  type="submit"
                  disabled={pending}
                  className="bg-[#800000] hover:bg-[#6a0000]"
                >
                  {pending ? "Creating…" : "Create teacher"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
