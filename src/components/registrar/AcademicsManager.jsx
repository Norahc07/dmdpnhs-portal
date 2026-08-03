"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  assignTeacher,
  createSection,
  createSubject,
  deleteSection,
  enrollStudentByRegistrar,
  removeTeacherAssignment,
  updateSection,
} from "@/actions/activation";
import { SubjectWeightsEditor } from "@/components/academics/SubjectWeightsEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DEFAULT_COMPONENT_WEIGHTS,
  normalizeComponentWeights,
} from "@/lib/class-record";
import { GRADE_LEVELS, SCHOOL_YEAR_DEFAULT, SHS_STRANDS, isSeniorHighGrade, nextStrandSectionLetter } from "@/lib/constants";
import { cn } from "@/lib/utils";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-9 text-sm";

function Toolbar({
  children,
  addLabel,
  onAdd,
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex flex-wrap items-end gap-2">{children}</div>
      <Button
        type="button"
        onClick={onAdd}
        className="bg-[#800000] hover:bg-[#6a0000]"
      >
        <Plus className="size-4" />
        {addLabel}
      </Button>
    </div>
  );
}

function EmptyRow({ colSpan, message }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

/** Keeps column widths stable across grade tabs / empty vs filled states. */
function FixedTable({ children, minWidth = "44rem", className }) {
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

function resolveSectionAdviser(section, teachers) {
  const adv = teachers.find((t) => t.id === section?.adviser_id);
  const linkedName = adv
    ? `${adv.profiles?.first_name || ""} ${adv.profiles?.last_name || ""}`.trim()
    : "";
  return {
    linkedName,
    label: linkedName || section?.adviser_name || "TBA",
    unlinked: !linkedName && Boolean(section?.adviser_name),
  };
}

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-3 last:border-b-0 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm text-foreground break-words">{value || "—"}</dd>
    </div>
  );
}

function SectionViewSheet({ section, teachers, open, onClose, onEdit }) {
  const adviser = resolveSectionAdviser(section, teachers);

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
        aria-label="Close section details"
        className={cn(
          "absolute inset-0 bg-black/25 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={section ? `Section ${section.section_name}` : "Section details"}
        className={cn(
          "absolute inset-y-0 right-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl ring-1 ring-black/5 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-[#800000] uppercase">
              Section details
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-foreground">
              {section?.section_name || "—"}
            </h2>
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

        <dl className="flex-1 overflow-y-auto px-5 py-2">
          <DetailRow label="Section" value={section?.section_name} />
          <DetailRow label="Track" value={section?.track_strand} />
          <DetailRow
            label="Grade"
            value={
              section?.grade_level != null
                ? `Grade ${section.grade_level}`
                : null
            }
          />
          <DetailRow label="School year" value={section?.school_year} />
          <DetailRow label="Location" value={section?.location} />
          <DetailRow
            label="Capacity"
            value={
              section?.capacity != null ? String(section.capacity) : null
            }
          />
          <DetailRow
            label="Male"
            value={
              section?.male_count != null ? String(section.male_count) : null
            }
          />
          <DetailRow
            label="Female"
            value={
              section?.female_count != null
                ? String(section.female_count)
                : null
            }
          />
          <DetailRow
            label="Adviser"
            value={
              adviser.unlinked
                ? `${adviser.label} (not linked to faculty)`
                : adviser.label
            }
          />
        </dl>

        <div className="flex gap-2 border-t px-5 py-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            className="flex-1 bg-[#800000] hover:bg-[#6a0000]"
            onClick={() => {
              onClose();
              onEdit?.(section);
            }}
          >
            <Pencil className="size-4" />
            Edit
          </Button>
        </div>
      </aside>
    </div>
  );
}

function WeightsEditSheet({ subject, open, onClose, onSaved }) {
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
        aria-label="Close grading weights"
        className={cn(
          "absolute inset-0 bg-black/25 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={
          subject
            ? `Edit grading weights for ${subject.subject_name}`
            : "Edit grading weights"
        }
        className={cn(
          "absolute inset-y-0 right-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl ring-1 ring-black/5 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="border-b bg-gradient-to-br from-[#800000]/10 to-transparent px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-[#800000] uppercase">
                Grading weights
              </p>
              <h2 className="mt-1 truncate text-lg font-semibold text-foreground">
                {subject?.subject_name || "Subject"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Grade {subject?.grade_level}
                {subject?.track_strand ? ` · ${subject.track_strand}` : ""}
              </p>
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
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            These weights are shared with teacher class records for this
            subject. Written, Performance, and Examinations must total 100%.
          </p>
        </div>

        {subject ? (
          <SubjectWeightsEditor
            key={subject.id}
            subjectId={subject.id}
            subjectName={subject.subject_name}
            initialWeights={subject}
            variant="panel"
            className="min-h-0 flex-1"
            onCancel={onClose}
            onSaved={(weights) => {
              onSaved?.(subject.id, weights);
              onClose();
            }}
          />
        ) : null}
      </aside>
    </div>
  );
}

function EditSectionModal({
  section,
  teachers,
  pending,
  formError,
  onSubmit,
}) {
  const [gradeLevel, setGradeLevel] = useState(
    String(section?.grade_level ?? "7")
  );
  const [schoolYear, setSchoolYear] = useState(
    section?.school_year || SCHOOL_YEAR_DEFAULT
  );
  const [sectionName, setSectionName] = useState(section?.section_name || "");
  const [trackStrand, setTrackStrand] = useState(section?.track_strand || "");
  const [location, setLocation] = useState(section?.location || "");
  const [capacity, setCapacity] = useState(
    section?.capacity != null ? String(section.capacity) : ""
  );
  const [maleCount, setMaleCount] = useState(
    section?.male_count != null ? String(section.male_count) : ""
  );
  const [femaleCount, setFemaleCount] = useState(
    section?.female_count != null ? String(section.female_count) : ""
  );
  const [adviserId, setAdviserId] = useState(section?.adviser_id || "");

  useEffect(() => {
    setGradeLevel(String(section?.grade_level ?? "7"));
    setSchoolYear(section?.school_year || SCHOOL_YEAR_DEFAULT);
    setSectionName(section?.section_name || "");
    setTrackStrand(section?.track_strand || "");
    setLocation(section?.location || "");
    setCapacity(section?.capacity != null ? String(section.capacity) : "");
    setMaleCount(section?.male_count != null ? String(section.male_count) : "");
    setFemaleCount(
      section?.female_count != null ? String(section.female_count) : ""
    );
    setAdviserId(section?.adviser_id || "");
  }, [section]);

  if (!section) return null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit section</DialogTitle>
        <DialogDescription>
          Update section details for {section.section_name}.
        </DialogDescription>
      </DialogHeader>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            id: section.id,
            sectionName: sectionName.trim(),
            gradeLevel: Number(gradeLevel),
            schoolYear: schoolYear.trim(),
            trackStrand: trackStrand.trim(),
            location: location.trim(),
            capacity,
            maleCount,
            femaleCount,
            adviserId: adviserId || null,
            adviserName: section.adviser_name || "",
          });
        }}
      >
        <div className="space-y-1.5">
          <Label>Section name</Label>
          <Input
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Grade level</Label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className={selectClass}
            >
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>School year</Label>
            <Input
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Track / strand</Label>
          <Input
            value={trackStrand}
            onChange={(e) => setTrackStrand(e.target.value)}
            placeholder="e.g. ICT (optional)"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Location</Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Building / room"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Capacity</Label>
            <Input
              type="number"
              min="0"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Male</Label>
            <Input
              type="number"
              min="0"
              value={maleCount}
              onChange={(e) => setMaleCount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Female</Label>
            <Input
              type="number"
              min="0"
              value={femaleCount}
              onChange={(e) => setFemaleCount(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Adviser</Label>
          <select
            value={adviserId}
            onChange={(e) => setAdviserId(e.target.value)}
            className={selectClass}
          >
            <option value="">TBA — To Be Announced</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.profiles?.first_name} {t.profiles?.last_name} (
                {t.teacher_id})
              </option>
            ))}
          </select>
        </div>
        {formError ? (
          <p className="text-sm text-rose-700">{formError}</p>
        ) : null}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="submit"
            disabled={pending}
            className="bg-[#800000] hover:bg-[#6a0000]"
          >
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

function AddSubjectModal({ defaultBand, defaultGrade, pending, formError, onSubmit }) {
  const [gradeLevel, setGradeLevel] = useState(
    String(defaultGrade || (defaultBand === "shs" ? "11" : "7"))
  );
  const [weights, setWeights] = useState(DEFAULT_COMPONENT_WEIGHTS);
  const shs = isSeniorHighGrade(gradeLevel);
  const gradeOptions = shs ? [11, 12] : [7, 8, 9, 10];
  const total =
    Number(weights.written || 0) +
    Number(weights.performance || 0) +
    Number(weights.assessment || 0);

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Add {shs ? "Senior High" : "Junior High"} subject
        </DialogTitle>
        <DialogDescription>
          {shs
            ? "Include track/strand and DepEd component weights for Grades 11–12."
            : "Set subject name, grade, and Written / Performance / Exam weights (must total 100)."}
        </DialogDescription>
      </DialogHeader>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = Object.fromEntries(new FormData(e.currentTarget));
          if (!isSeniorHighGrade(fd.gradeLevel)) {
            fd.trackStrand = "";
          }
          fd.writtenWeight = weights.written;
          fd.performanceWeight = weights.performance;
          fd.assessmentWeight = weights.assessment;
          onSubmit(fd);
        }}
      >
        <div className="space-y-1.5">
          <Label>Subject name</Label>
          <Input name="subjectName" required placeholder="e.g. Filipino" />
        </div>
        <div className="space-y-1.5">
          <Label>Grade level</Label>
          <select
            name="gradeLevel"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className={selectClass}
          >
            {gradeOptions.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>
        {shs ? (
          <div className="space-y-1.5">
            <Label>Track / Strand</Label>
            <select
              name="trackStrand"
              defaultValue={SHS_STRANDS[0]}
              className={selectClass}
              required
            >
              {SHS_STRANDS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="rounded-lg border bg-neutral-50 p-3">
          <p className="mb-2 text-xs font-medium text-[#3d1212]">
            Component weights (must total 100%)
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Written %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={weights.written}
                onChange={(e) =>
                  setWeights((w) => ({ ...w, written: Number(e.target.value) }))
                }
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Performance %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={weights.performance}
                onChange={(e) =>
                  setWeights((w) => ({
                    ...w,
                    performance: Number(e.target.value),
                  }))
                }
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Examinations %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={weights.assessment}
                onChange={(e) =>
                  setWeights((w) => ({
                    ...w,
                    assessment: Number(e.target.value),
                  }))
                }
                className="h-9"
              />
            </div>
          </div>
          <p
            className={`mt-2 text-xs ${total === 100 ? "text-emerald-700" : "text-rose-700"}`}
          >
            Total: {total}%
          </p>
        </div>

        {formError ? (
          <p className="text-sm text-rose-700">{formError}</p>
        ) : null}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="submit"
            disabled={pending || total !== 100}
            className="bg-[#800000] hover:bg-[#6a0000]"
          >
            {pending ? "Saving…" : "Save subject"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

function AddSectionModal({
  sections,
  teachers,
  pending,
  formError,
  onSubmit,
  defaultGrade = "7",
}) {
  const [gradeLevel, setGradeLevel] = useState(String(defaultGrade || "7"));
  const [schoolYear, setSchoolYear] = useState(SCHOOL_YEAR_DEFAULT);
  const [strand, setStrand] = useState(SHS_STRANDS[0]);
  const [sectionName, setSectionName] = useState("");

  const shs = isSeniorHighGrade(gradeLevel);

  const nextLetter = useMemo(() => {
    if (!shs || !strand) return null;
    const peers = sections
      .filter(
        (s) =>
          Number(s.grade_level) === Number(gradeLevel) &&
          s.school_year === schoolYear
      )
      .map((s) => s.section_name);
    return nextStrandSectionLetter(peers, strand);
  }, [sections, gradeLevel, schoolYear, strand, shs]);

  const previewName =
    shs && strand && nextLetter ? `${strand} ${nextLetter}` : "";

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add section</DialogTitle>
        <DialogDescription>
          Grades 11–12 use Senior High strands with auto section letters (A, B,
          C…). Junior High uses a custom section name.
        </DialogDescription>
      </DialogHeader>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const grade = Number(fd.get("gradeLevel"));
          let name = String(fd.get("sectionName") || "").trim();

          if (isSeniorHighGrade(grade)) {
            const selectedStrand = String(fd.get("strand") || "").trim();
            if (!selectedStrand) {
              return;
            }
            const peers = sections
              .filter(
                (s) =>
                  Number(s.grade_level) === grade &&
                  s.school_year === String(fd.get("schoolYear") || "").trim()
              )
              .map((s) => s.section_name);
            const letter = nextStrandSectionLetter(peers, selectedStrand);
            if (!letter) {
              toast.error(
                "All section letters A–Z are already used for this strand."
              );
              return;
            }
            name = `${selectedStrand} ${letter}`;
          }

          if (!name) {
            toast.error("Enter a section name or select a strand.");
            return;
          }

          onSubmit({
            gradeLevel: grade,
            schoolYear: String(fd.get("schoolYear") || "").trim(),
            sectionName: name,
            adviserId: fd.get("adviserId") || null,
          });
        }}
      >
        <div className="space-y-1.5">
          <Label>Grade level</Label>
          <select
            name="gradeLevel"
            value={gradeLevel}
            onChange={(e) => {
              setGradeLevel(e.target.value);
              setSectionName("");
            }}
            className={selectClass}
          >
            {GRADE_LEVELS.map((g) => (
              <option key={g} value={g}>
                Grade {g}
                {g >= 11 ? " (Senior High)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label>School year</Label>
          <Input
            name="schoolYear"
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            placeholder="e.g. 2025-2026"
            required
          />
        </div>

        {shs ? (
          <div className="space-y-1.5">
            <Label>Strand</Label>
            <select
              name="strand"
              value={strand}
              onChange={(e) => setStrand(e.target.value)}
              className={selectClass}
              required
            >
              {SHS_STRANDS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Next section name:{" "}
              <span className="font-semibold text-[#800000]">
                {previewName || "— (all letters A–Z used)"}
              </span>
            </p>
            <input type="hidden" name="sectionName" value={previewName} />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Section name</Label>
            <Input
              name="sectionName"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              required
              placeholder="e.g. Rose"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Adviser (optional)</Label>
          <select name="adviserId" defaultValue="" className={selectClass}>
            <option value="">TBA — To Be Announced</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.profiles?.first_name} {t.profiles?.last_name} (
                {t.teacher_id})
              </option>
            ))}
          </select>
        </div>

        {formError ? (
          <p className="text-sm text-rose-700">{formError}</p>
        ) : null}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="submit"
            disabled={pending || (shs && !nextLetter)}
            className="bg-[#800000] hover:bg-[#6a0000]"
          >
            {pending ? "Saving…" : "Save section"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function AcademicsManager({
  subjects,
  sections,
  teachers,
  assignments,
  students = [],
}) {
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState(null); // subjects | sections | enroll | assign | editSection | deleteSection
  const [editSubject, setEditSubject] = useState(null);
  const [viewSection, setViewSection] = useState(null);
  const [editSection, setEditSection] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formError, setFormError] = useState("");
  const [localSubjects, setLocalSubjects] = useState(subjects);

  useEffect(() => {
    setLocalSubjects(subjects);
  }, [subjects]);

  const [subjectBand, setSubjectBand] = useState("jhs"); // jhs | shs
  const [subjectGrade, setSubjectGrade] = useState("7");

  const [sectionBand, setSectionBand] = useState("jhs"); // jhs | shs
  const [sectionGrade, setSectionGrade] = useState("7");

  const [enrollGrade, setEnrollGrade] = useState("all");
  const [enrollSection, setEnrollSection] = useState("all");
  const [enrollQ, setEnrollQ] = useState("");

  const [assignBand, setAssignBand] = useState("jhs"); // jhs | shs
  const [assignGrade, setAssignGrade] = useState("7");
  const [assignSubject, setAssignSubject] = useState("all");
  const [assignQ, setAssignQ] = useState("");

  const subjectGradeOptions = useMemo(
    () => (subjectBand === "shs" ? [11, 12] : [7, 8, 9, 10]),
    [subjectBand]
  );

  const subjectsByGrade = useMemo(() => {
    const map = {};
    for (const g of subjectGradeOptions) {
      map[g] = localSubjects.filter((s) => {
        const isShs = isSeniorHighGrade(s.grade_level);
        if (subjectBand === "jhs" && isShs) return false;
        if (subjectBand === "shs" && !isShs) return false;
        return Number(s.grade_level) === g;
      });
    }
    return map;
  }, [localSubjects, subjectBand, subjectGradeOptions]);

  const bandSubjectTotal = useMemo(
    () =>
      localSubjects.filter((s) =>
        subjectBand === "shs"
          ? isSeniorHighGrade(s.grade_level)
          : !isSeniorHighGrade(s.grade_level)
      ).length,
    [localSubjects, subjectBand]
  );

  const sectionGradeOptions = useMemo(
    () => (sectionBand === "shs" ? [11, 12] : [7, 8, 9, 10]),
    [sectionBand]
  );

  const sectionsByGrade = useMemo(() => {
    const map = {};
    for (const g of sectionGradeOptions) {
      map[g] = sections.filter((s) => {
        const isShs = isSeniorHighGrade(s.grade_level);
        if (sectionBand === "jhs" && isShs) return false;
        if (sectionBand === "shs" && !isShs) return false;
        return Number(s.grade_level) === g;
      });
    }
    return map;
  }, [sections, sectionBand, sectionGradeOptions]);

  const bandSectionTotal = useMemo(
    () =>
      sections.filter((s) =>
        sectionBand === "shs"
          ? isSeniorHighGrade(s.grade_level)
          : !isSeniorHighGrade(s.grade_level)
      ).length,
    [sections, sectionBand]
  );

  const filteredSections = useMemo(() => {
    return sectionsByGrade[Number(sectionGrade)] || [];
  }, [sectionsByGrade, sectionGrade]);

  const filteredStudents = useMemo(() => {
    return students.filter((stu) => {
      if (enrollGrade !== "all" && String(stu.grade_level) !== enrollGrade) {
        return false;
      }
      if (enrollSection !== "all" && stu.section_id !== enrollSection) {
        return false;
      }
      const name = `${stu.profiles?.first_name || ""} ${stu.profiles?.last_name || ""} ${stu.lrn}`;
      if (enrollQ && !name.toLowerCase().includes(enrollQ.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [students, enrollGrade, enrollSection, enrollQ]);

  const assignGradeOptions = useMemo(
    () => (assignBand === "shs" ? [11, 12] : [7, 8, 9, 10]),
    [assignBand]
  );

  const assignSubjectOptions = useMemo(() => {
    const names = new Set();
    for (const s of localSubjects) {
      if (Number(s.grade_level) !== Number(assignGrade)) continue;
      if (s.subject_name) names.add(s.subject_name);
    }
    // Also include subject names already present on assignments for this grade
    for (const a of assignments) {
      if (Number(a.sections?.grade_level) !== Number(assignGrade)) continue;
      const name = a.subjects?.subject_name;
      if (name) names.add(name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [localSubjects, assignments, assignGrade]);

  const assignmentsByGrade = useMemo(() => {
    const q = assignQ.trim().toLowerCase();
    const map = {};
    for (const g of assignGradeOptions) {
      map[g] = assignments.filter((a) => {
        const grade = Number(a.sections?.grade_level);
        const isShs = isSeniorHighGrade(grade);
        if (assignBand === "jhs" && isShs) return false;
        if (assignBand === "shs" && !isShs) return false;
        if (grade !== g) return false;
        if (
          assignSubject !== "all" &&
          a.subjects?.subject_name !== assignSubject
        ) {
          return false;
        }
        if (q) {
          const hay = `${a.teachers?.profiles?.first_name || ""} ${a.teachers?.profiles?.last_name || ""} ${a.sections?.section_name || ""} ${a.subjects?.subject_name || ""} ${a.school_year || ""}`;
          if (!hay.toLowerCase().includes(q)) return false;
        }
        return true;
      });
    }
    return map;
  }, [
    assignments,
    assignBand,
    assignGradeOptions,
    assignQ,
    assignSubject,
  ]);

  const bandAssignmentTotal = useMemo(
    () =>
      assignments.filter((a) => {
        const isShs = isSeniorHighGrade(a.sections?.grade_level);
        return assignBand === "shs" ? isShs : !isShs;
      }).length,
    [assignments, assignBand]
  );

  const filteredAssignments = useMemo(() => {
    return assignmentsByGrade[Number(assignGrade)] || [];
  }, [assignmentsByGrade, assignGrade]);

  function openModal(type) {
    setFormError("");
    setModal(type);
  }

  function closeModal() {
    setModal(null);
    setEditSubject(null);
    setEditSection(null);
    setDeleteTarget(null);
    setFormError("");
  }

  function openEditSection(section) {
    setFormError("");
    setEditSection(section);
    setModal("editSection");
  }

  function openDeleteSection(section) {
    setFormError("");
    setDeleteTarget(section);
    setModal("deleteSection");
  }

  function submit(action, payload) {
    setFormError("");
    startTransition(async () => {
      const result = await action(payload);
      if (result?.error) {
        setFormError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Saved successfully.");
      closeModal();
    });
  }

  function confirmDeleteSection() {
    if (!deleteTarget?.id) return;
    setFormError("");
    startTransition(async () => {
      const result = await deleteSection(deleteTarget.id);
      if (result?.error) {
        setFormError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Section deleted.");
      closeModal();
    });
  }

  function removeAssignment(id) {
    startTransition(async () => {
      const result = await removeTeacherAssignment(id);
      if (result?.error) toast.error(result.error);
      else toast.success("Assignment removed.");
    });
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="subjects" className="w-full">
        <TabsList
          variant="line"
          className="mb-4 h-auto w-full flex-wrap justify-start gap-1"
        >
          <TabsTrigger value="subjects" className="px-3 py-2">
            Subjects
          </TabsTrigger>
          <TabsTrigger value="sections" className="px-3 py-2">
            Sections
          </TabsTrigger>
          <TabsTrigger value="enroll" className="px-3 py-2">
            Enroll students
          </TabsTrigger>
          <TabsTrigger value="assign" className="px-3 py-2">
            Assign teachers
          </TabsTrigger>
        </TabsList>

        {/* SUBJECTS */}
        <TabsContent value="subjects" className="rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className={
                  subjectBand === "jhs"
                    ? "border-[#800000]/20 bg-[#800000]/10 text-[#800000] ring-1 ring-[#800000]/12"
                    : "border-[#800000]/20 text-[#800000]"
                }
                onClick={() => {
                  setSubjectBand("jhs");
                  setSubjectGrade("7");
                }}
              >
                Junior High (7–10)
              </Button>
              <Button
                type="button"
                variant="outline"
                className={
                  subjectBand === "shs"
                    ? "border-[#800000]/20 bg-[#800000]/10 text-[#800000] ring-1 ring-[#800000]/12"
                    : "border-[#800000]/20 text-[#800000]"
                }
                onClick={() => {
                  setSubjectBand("shs");
                  setSubjectGrade("11");
                }}
              >
                Senior High (11–12)
              </Button>
            </div>
            <Button
              type="button"
              onClick={() => openModal("subjects")}
              className="bg-[#800000] hover:bg-[#6a0000]"
            >
              <Plus className="size-4" />
              Add subject
            </Button>
          </div>

          <div className="mb-3 flex flex-wrap gap-1 border-b border-[#800000]/15">
            {subjectGradeOptions.map((g) => {
              const count = subjectsByGrade[g]?.length || 0;
              const active = String(subjectGrade) === String(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSubjectGrade(String(g))}
                  className={cn(
                    "relative -mb-px inline-flex items-center gap-1.5 border-b-[3px] px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "border-[#800000] font-bold text-[#800000]"
                      : "border-transparent font-medium text-muted-foreground hover:border-[#800000]/30 hover:text-[#5c2a2a]"
                  )}
                >
                  Grade {g}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                      active
                        ? "bg-[#800000]/10 text-[#800000] ring-1 ring-[#800000]/12"
                        : "bg-muted font-semibold text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {(() => {
            const g = Number(subjectGrade);
            const rows = subjectsByGrade[g] || [];
            const colSpan = subjectBand === "shs" ? 4 : 3;
            return (
              <>
                  <FixedTable minWidth={subjectBand === "shs" ? "48rem" : "40rem"}>
                    <colgroup>
                      {subjectBand === "shs" ? (
                        <>
                          <col style={{ width: "34%" }} />
                          <col style={{ width: "30%" }} />
                          <col style={{ width: "18%" }} />
                          <col style={{ width: "18%" }} />
                        </>
                      ) : (
                        <>
                          <col style={{ width: "52%" }} />
                          <col style={{ width: "24%" }} />
                          <col style={{ width: "24%" }} />
                        </>
                      )}
                    </colgroup>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        {subjectBand === "shs" ? (
                          <TableHead>Track / Strand</TableHead>
                        ) : null}
                        <TableHead>Weights (W/P/E)</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 && (
                        <EmptyRow
                          colSpan={colSpan}
                          message={`No Grade ${g} subjects yet. Add a subject for this grade.`}
                        />
                      )}
                      {rows.map((s) => {
                        const w = normalizeComponentWeights(s);
                        return (
                          <TableRow key={s.id}>
                            <TruncateCell className="font-medium">
                              {s.subject_name}
                            </TruncateCell>
                            {subjectBand === "shs" ? (
                              <TruncateCell>
                                {s.track_strand || "—"}
                              </TruncateCell>
                            ) : null}
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {w.written}/{w.performance}/{w.assessment}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 border-[#800000]/20 text-[#800000]"
                                onClick={() => setEditSubject(s)}
                              >
                                <Pencil className="size-3.5" />
                                Weights
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </FixedTable>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Grade {g}: {rows.length} subject
                    {rows.length === 1 ? "" : "s"} ·{" "}
                    {subjectBand === "shs" ? "Senior High" : "Junior High"}{" "}
                    total {bandSubjectTotal}. Weights are shared with teacher
                    class records (Written / Performance / Examinations).
                  </p>
              </>
            );
          })()}
        </TabsContent>

        {/* SECTIONS */}
        <TabsContent value="sections" className="rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className={
                  sectionBand === "jhs"
                    ? "border-[#800000]/20 bg-[#800000]/10 text-[#800000] ring-1 ring-[#800000]/12"
                    : "border-[#800000]/20 text-[#800000]"
                }
                onClick={() => {
                  setSectionBand("jhs");
                  setSectionGrade("7");
                }}
              >
                Junior High (7–10)
              </Button>
              <Button
                type="button"
                variant="outline"
                className={
                  sectionBand === "shs"
                    ? "border-[#800000]/20 bg-[#800000]/10 text-[#800000] ring-1 ring-[#800000]/12"
                    : "border-[#800000]/20 text-[#800000]"
                }
                onClick={() => {
                  setSectionBand("shs");
                  setSectionGrade("11");
                }}
              >
                Senior High (11–12)
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Button
                type="button"
                onClick={() => openModal("sections")}
                className="bg-[#800000] hover:bg-[#6a0000]"
              >
                <Plus className="size-4" />
                Add section
              </Button>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-1 border-b border-[#800000]/15">
            {sectionGradeOptions.map((g) => {
              const count = sectionsByGrade[g]?.length || 0;
              const active = String(sectionGrade) === String(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSectionGrade(String(g))}
                  className={cn(
                    "relative -mb-px inline-flex items-center gap-1.5 border-b-[3px] px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "border-[#800000] font-bold text-[#800000]"
                      : "border-transparent font-medium text-muted-foreground hover:border-[#800000]/30 hover:text-[#5c2a2a]"
                  )}
                >
                  Grade {g}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                      active
                        ? "bg-[#800000]/10 text-[#800000] ring-1 ring-[#800000]/12"
                        : "bg-muted font-semibold text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {(() => {
            const g = Number(sectionGrade);
            const rows = filteredSections;
            return (
              <>
                <FixedTable minWidth="52rem">
                  <colgroup>
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "28%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "24%" }} />
                    <col style={{ width: "6%" }} />
                  </colgroup>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Section</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="whitespace-nowrap">Male</TableHead>
                      <TableHead className="whitespace-nowrap">Female</TableHead>
                      <TableHead>Adviser</TableHead>
                      <TableHead className="text-right">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 && (
                      <EmptyRow
                        colSpan={6}
                        message={`No Grade ${g} sections yet. Add a section for this grade.`}
                      />
                    )}
                    {rows.map((s) => {
                      const adviser = resolveSectionAdviser(s, teachers);
                      return (
                        <TableRow key={s.id}>
                          <TruncateCell className="font-medium">
                            {s.section_name}
                          </TruncateCell>
                          <TruncateCell
                            className="text-muted-foreground"
                            title={s.location || undefined}
                          >
                            {s.location || "—"}
                          </TruncateCell>
                          <TableCell className="tabular-nums text-muted-foreground">
                            {s.male_count != null ? s.male_count : "—"}
                          </TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">
                            {s.female_count != null ? s.female_count : "—"}
                          </TableCell>
                          <TruncateCell
                            title={
                              adviser.unlinked
                                ? `${adviser.label} (Not linked to faculty account)`
                                : adviser.label
                            }
                          >
                            <span className="block truncate">
                              {adviser.label}
                            </span>
                            {adviser.unlinked ? (
                              <span className="block truncate text-[11px] text-amber-700">
                                Not linked to faculty account
                              </span>
                            ) : null}
                          </TruncateCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="text-muted-foreground"
                                    aria-label={`Actions for ${s.section_name}`}
                                  />
                                }
                              >
                                <MoreHorizontal className="size-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="min-w-36"
                              >
                                <DropdownMenuItem
                                  onClick={() => setViewSection(s)}
                                >
                                  <Eye className="size-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openEditSection(s)}
                                >
                                  <Pencil className="size-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => openDeleteSection(s)}
                                >
                                  <Trash2 className="size-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </FixedTable>
                <p className="mt-2 text-xs text-muted-foreground">
                  Grade {g}: {rows.length} section
                  {rows.length === 1 ? "" : "s"} ·{" "}
                  {sectionBand === "shs" ? "Senior High" : "Junior High"} total{" "}
                  {bandSectionTotal}.
                </p>
              </>
            );
          })()}
        </TabsContent>

        {/* ENROLL */}
        <TabsContent value="enroll" className="rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <Toolbar
            addLabel="Enroll student"
            onAdd={() => openModal("enroll")}
          >
            <div className="space-y-1">
              <Label className="text-xs">Grade</Label>
              <select
                value={enrollGrade}
                onChange={(e) => {
                  setEnrollGrade(e.target.value);
                  setEnrollSection("all");
                }}
                className={selectClass}
              >
                <option value="all">All grades</option>
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Section</Label>
              <select
                value={enrollSection}
                onChange={(e) => setEnrollSection(e.target.value)}
                className={selectClass}
              >
                <option value="all">All sections</option>
                {sections
                  .filter(
                    (s) =>
                      enrollGrade === "all" ||
                      String(s.grade_level) === enrollGrade
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      Grade {s.grade_level} · {s.section_name}
                      {s.track_strand ? ` · ${s.track_strand}` : ""}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Search</Label>
              <SearchInput
                value={enrollQ}
                onChange={(e) => setEnrollQ(e.target.value)}
                placeholder="Name or LRN…"
                className="w-48"
              />
            </div>
          </Toolbar>
          <FixedTable minWidth="56rem">
            <colgroup>
              <col style={{ width: "22%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>LRN</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Activation</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 && (
                <EmptyRow colSpan={7} message="No enrolled students found." />
              )}
              {filteredStudents.map((stu) => (
                <TableRow key={stu.id}>
                  <TruncateCell
                    className="font-medium"
                    title={`${stu.profiles?.last_name || ""}, ${stu.profiles?.first_name || ""}`}
                  >
                    {stu.profiles?.last_name}, {stu.profiles?.first_name}
                  </TruncateCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {stu.lrn}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {stu.gender}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {stu.grade_level}
                  </TableCell>
                  <TruncateCell>
                    {stu.sections?.section_name || "—"}
                  </TruncateCell>
                  <TruncateCell>{stu.activation_status || "—"}</TruncateCell>
                  <TruncateCell>{stu.status}</TruncateCell>
                </TableRow>
              ))}
            </TableBody>
          </FixedTable>
          <p className="mt-2 text-xs text-muted-foreground">
            Showing {filteredStudents.length} of {students.length} students
          </p>
        </TabsContent>

        {/* ASSIGN */}
        <TabsContent value="assign" className="rounded-2xl border border-[#800000]/10 bg-white p-4 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className={
                  assignBand === "jhs"
                    ? "border-[#800000]/20 bg-[#800000]/10 text-[#800000] ring-1 ring-[#800000]/12"
                    : "border-[#800000]/20 text-[#800000]"
                }
                onClick={() => {
                  setAssignBand("jhs");
                  setAssignGrade("7");
                  setAssignSubject("all");
                }}
              >
                Junior High (7–10)
              </Button>
              <Button
                type="button"
                variant="outline"
                className={
                  assignBand === "shs"
                    ? "border-[#800000]/20 bg-[#800000]/10 text-[#800000] ring-1 ring-[#800000]/12"
                    : "border-[#800000]/20 text-[#800000]"
                }
                onClick={() => {
                  setAssignBand("shs");
                  setAssignGrade("11");
                  setAssignSubject("all");
                }}
              >
                Senior High (11–12)
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Subject</Label>
                <select
                  value={assignSubject}
                  onChange={(e) => setAssignSubject(e.target.value)}
                  className={selectClass}
                >
                  <option value="all">All subjects</option>
                  {assignSubjectOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Search</Label>
                <SearchInput
                  value={assignQ}
                  onChange={(e) => setAssignQ(e.target.value)}
                  placeholder="Teacher, section…"
                  className="w-52"
                />
              </div>
              <Button
                type="button"
                onClick={() => openModal("assign")}
                className="bg-[#800000] hover:bg-[#6a0000]"
              >
                <Plus className="size-4" />
                Assign teacher
              </Button>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-1 border-b border-[#800000]/15">
            {assignGradeOptions.map((g) => {
              const count = assignmentsByGrade[g]?.length || 0;
              const active = String(assignGrade) === String(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setAssignGrade(String(g));
                    setAssignSubject("all");
                  }}
                  className={cn(
                    "relative -mb-px inline-flex items-center gap-1.5 border-b-[3px] px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "border-[#800000] font-bold text-[#800000]"
                      : "border-transparent font-medium text-muted-foreground hover:border-[#800000]/30 hover:text-[#5c2a2a]"
                  )}
                >
                  Grade {g}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                      active
                        ? "bg-[#800000]/10 text-[#800000] ring-1 ring-[#800000]/12"
                        : "bg-muted font-semibold text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {(() => {
            const g = Number(assignGrade);
            const rows = filteredAssignments;
            return (
              <>
                <FixedTable minWidth="52rem">
                  <colgroup>
                    <col style={{ width: "26%" }} />
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "24%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "14%" }} />
                  </colgroup>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>School year</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 && (
                      <EmptyRow
                        colSpan={5}
                        message={
                          assignQ.trim() || assignSubject !== "all"
                            ? `No Grade ${g} assignments match your filters.`
                            : `No Grade ${g} teacher assignments yet.`
                        }
                      />
                    )}
                    {rows.map((a) => {
                      const teacherName = `${a.teachers?.profiles?.first_name || ""} ${a.teachers?.profiles?.last_name || ""}`.trim();
                      return (
                        <TableRow key={a.id}>
                          <TruncateCell
                            className="font-medium"
                            title={teacherName || undefined}
                          >
                            {teacherName || "—"}
                          </TruncateCell>
                          <TruncateCell>
                            {a.sections?.section_name || "—"}
                          </TruncateCell>
                          <TruncateCell>
                            {a.subjects?.subject_name || "—"}
                          </TruncateCell>
                          <TableCell className="whitespace-nowrap">
                            {a.school_year}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={pending}
                              onClick={() => removeAssignment(a.id)}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </FixedTable>
                <p className="mt-2 text-xs text-muted-foreground">
                  Grade {g}: {rows.length} assignment
                  {rows.length === 1 ? "" : "s"}
                  {assignQ.trim() ? " matching search" : ""} ·{" "}
                  {assignBand === "shs" ? "Senior High" : "Junior High"} total{" "}
                  {bandAssignmentTotal}.
                </p>
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* ADD MODALS */}
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          {modal === "subjects" && (
            <AddSubjectModal
              key={`${subjectBand}-${subjectGrade}`}
              defaultBand={subjectBand}
              defaultGrade={subjectGrade}
              pending={pending}
              formError={formError}
              onSubmit={(payload) => submit(createSubject, payload)}
            />
          )}

          {modal === "sections" && (
            <AddSectionModal
              key={`${sectionBand}-${sectionGrade}`}
              sections={sections}
              teachers={teachers}
              pending={pending}
              formError={formError}
              defaultGrade={sectionGrade}
              onSubmit={(payload) => submit(createSection, payload)}
            />
          )}

          {modal === "enroll" && (
            <>
              <DialogHeader>
                <DialogTitle>Enroll student</DialogTitle>
                <DialogDescription>
                  Create a learner record so they can register a portal account.
                </DialogDescription>
              </DialogHeader>
              <form
                className="grid gap-3 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(
                    enrollStudentByRegistrar,
                    Object.fromEntries(new FormData(e.currentTarget))
                  );
                }}
              >
                <div className="space-y-1.5">
                  <Label>LRN (12 digits)</Label>
                  <Input
                    name="lrn"
                    required
                    maxLength={12}
                    placeholder="12-digit LRN"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Birthdate</Label>
                  <Input
                    name="birthdate"
                    type="date"
                    required
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>First name</Label>
                  <Input name="firstName" placeholder="e.g. Juan" />
                </div>
                <div className="space-y-1.5">
                  <Label>Last name</Label>
                  <Input name="lastName" placeholder="e.g. Dela Cruz" />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <select name="gender" defaultValue="Male" className={selectClass}>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Grade level</Label>
                  <select
                    name="gradeLevel"
                    defaultValue="7"
                    className={selectClass}
                  >
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Section</Label>
                  <select name="sectionId" defaultValue="" className={selectClass}>
                    <option value="">— Assign later —</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        Grade {s.grade_level} · {s.section_name} ({s.school_year})
                      </option>
                    ))}
                  </select>
                </div>
                {formError ? (
                  <p className="text-sm text-rose-700 sm:col-span-2">{formError}</p>
                ) : null}
                <DialogFooter className="sm:col-span-2">
                  <DialogClose render={<Button type="button" variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={pending}
                    className="bg-[#800000] hover:bg-[#6a0000]"
                  >
                    {pending ? "Saving…" : "Enroll student"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}

          {modal === "assign" && (
            <>
              <DialogHeader>
                <DialogTitle>Assign teacher</DialogTitle>
                <DialogDescription>
                  Link a teacher to a Grade {assignGrade} section and subject
                  for a school year.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(
                    assignTeacher,
                    Object.fromEntries(new FormData(e.currentTarget))
                  );
                }}
              >
                <div className="space-y-1.5">
                  <Label>Teacher</Label>
                  <select name="teacherId" required className={selectClass}>
                    <option value="">Select teacher…</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.profiles?.first_name} {t.profiles?.last_name} (
                        {t.teacher_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Section (Grade {assignGrade})</Label>
                  <select name="sectionId" required className={selectClass}>
                    <option value="">Select section…</option>
                    {sections
                      .filter(
                        (s) => Number(s.grade_level) === Number(assignGrade)
                      )
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.section_name} ({s.school_year})
                          {s.track_strand ? ` · ${s.track_strand}` : ""}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Subject (Grade {assignGrade})</Label>
                  <select name="subjectId" required className={selectClass}>
                    <option value="">Select subject…</option>
                    {localSubjects
                      .filter(
                        (s) => Number(s.grade_level) === Number(assignGrade)
                      )
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.subject_name}
                          {s.track_strand ? ` · ${s.track_strand}` : ""}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>School year</Label>
                  <Input
                    name="schoolYear"
                    defaultValue={SCHOOL_YEAR_DEFAULT}
                    placeholder="e.g. 2025-2026"
                  />
                </div>
                {formError ? (
                  <p className="text-sm text-rose-700">{formError}</p>
                ) : null}
                <DialogFooter>
                  <DialogClose render={<Button type="button" variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={pending}
                    className="bg-[#800000] hover:bg-[#6a0000]"
                  >
                    {pending ? "Saving…" : "Assign teacher"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}

          {modal === "editSection" && (
            <EditSectionModal
              key={editSection?.id || "edit-section"}
              section={editSection}
              teachers={teachers}
              pending={pending}
              formError={formError}
              onSubmit={(payload) => submit(updateSection, payload)}
            />
          )}

          {modal === "deleteSection" && deleteTarget ? (
            <>
              <DialogHeader>
                <DialogTitle>Delete section</DialogTitle>
                <DialogDescription>
                  Delete{" "}
                  <span className="font-medium text-foreground">
                    {deleteTarget.section_name}
                  </span>
                  ? Students in this section will be unassigned. Teacher
                  assignments for this section will also be removed. This cannot
                  be undone.
                </DialogDescription>
              </DialogHeader>
              {formError ? (
                <p className="text-sm text-rose-700">{formError}</p>
              ) : null}
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={pending}
                  onClick={confirmDeleteSection}
                >
                  {pending ? "Deleting…" : "Delete section"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <SectionViewSheet
        section={viewSection}
        teachers={teachers}
        open={Boolean(viewSection)}
        onClose={() => setViewSection(null)}
        onEdit={openEditSection}
      />

      <WeightsEditSheet
        subject={editSubject}
        open={Boolean(editSubject)}
        onClose={() => setEditSubject(null)}
        onSaved={(subjectId, weights) => {
          setLocalSubjects((rows) =>
            rows.map((row) =>
              row.id === subjectId
                ? {
                    ...row,
                    written_weight: weights.written,
                    performance_weight: weights.performance,
                    assessment_weight: weights.assessment,
                  }
                : row
            )
          );
        }}
      />
    </div>
  );
}
