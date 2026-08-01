"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  assignTeacher,
  createSection,
  createSubject,
  enrollStudentByRegistrar,
  removeTeacherAssignment,
} from "@/actions/activation";
import { SubjectWeightsEditor } from "@/components/academics/SubjectWeightsEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function AddSubjectModal({ defaultBand, pending, formError, onSubmit }) {
  const [gradeLevel, setGradeLevel] = useState(
    defaultBand === "shs" ? "11" : "7"
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

function AddSectionModal({ sections, teachers, pending, formError, onSubmit }) {
  const [gradeLevel, setGradeLevel] = useState("7");
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
  const [modal, setModal] = useState(null); // subjects | sections | enroll | assign | editWeights
  const [editSubject, setEditSubject] = useState(null);
  const [formError, setFormError] = useState("");
  const [localSubjects, setLocalSubjects] = useState(subjects);

  useEffect(() => {
    setLocalSubjects(subjects);
  }, [subjects]);

  const [subjectBand, setSubjectBand] = useState("jhs"); // jhs | shs
  const [subjectGrade, setSubjectGrade] = useState("all");
  const [subjectQ, setSubjectQ] = useState("");

  const [sectionYear, setSectionYear] = useState("all");
  const [sectionGrade, setSectionGrade] = useState("all");
  const [sectionQ, setSectionQ] = useState("");

  const [enrollGrade, setEnrollGrade] = useState("all");
  const [enrollSection, setEnrollSection] = useState("all");
  const [enrollQ, setEnrollQ] = useState("");

  const [assignYear, setAssignYear] = useState("all");
  const [assignQ, setAssignQ] = useState("");

  const schoolYears = useMemo(() => {
    const years = new Set(sections.map((s) => s.school_year).filter(Boolean));
    years.add(SCHOOL_YEAR_DEFAULT);
    return Array.from(years).sort().reverse();
  }, [sections]);

  const filteredSubjects = useMemo(() => {
    return localSubjects.filter((s) => {
      const isShs = isSeniorHighGrade(s.grade_level);
      if (subjectBand === "jhs" && isShs) return false;
      if (subjectBand === "shs" && !isShs) return false;
      if (subjectGrade !== "all" && String(s.grade_level) !== subjectGrade) {
        return false;
      }
      if (
        subjectQ &&
        !`${s.subject_name} ${s.track_strand || ""}`
          .toLowerCase()
          .includes(subjectQ.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [localSubjects, subjectBand, subjectGrade, subjectQ]);

  const subjectGradeOptions =
    subjectBand === "shs" ? [11, 12] : [7, 8, 9, 10];

  const bandSubjectTotal = useMemo(
    () =>
      localSubjects.filter((s) =>
        subjectBand === "shs"
          ? isSeniorHighGrade(s.grade_level)
          : !isSeniorHighGrade(s.grade_level)
      ).length,
    [localSubjects, subjectBand]
  );

  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      if (sectionYear !== "all" && s.school_year !== sectionYear) return false;
      if (sectionGrade !== "all" && String(s.grade_level) !== sectionGrade) {
        return false;
      }
      if (
        sectionQ &&
        !s.section_name.toLowerCase().includes(sectionQ.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [sections, sectionYear, sectionGrade, sectionQ]);

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

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (assignYear !== "all" && a.school_year !== assignYear) return false;
      const hay = `${a.teachers?.profiles?.first_name || ""} ${a.teachers?.profiles?.last_name || ""} ${a.sections?.section_name || ""} ${a.subjects?.subject_name || ""}`;
      if (assignQ && !hay.toLowerCase().includes(assignQ.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [assignments, assignYear, assignQ]);

  function openModal(type) {
    setFormError("");
    setModal(type);
  }

  function closeModal() {
    setModal(null);
    setEditSubject(null);
    setFormError("");
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
        <TabsContent value="subjects" className="rounded-xl border bg-white p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant={subjectBand === "jhs" ? "default" : "outline"}
              className={
                subjectBand === "jhs"
                  ? "bg-[#800000] hover:bg-[#6a0000]"
                  : "border-[#800000]/20 text-[#800000]"
              }
              onClick={() => {
                setSubjectBand("jhs");
                setSubjectGrade("all");
              }}
            >
              Junior High (7–10)
            </Button>
            <Button
              type="button"
              variant={subjectBand === "shs" ? "default" : "outline"}
              className={
                subjectBand === "shs"
                  ? "bg-[#800000] hover:bg-[#6a0000]"
                  : "border-[#800000]/20 text-[#800000]"
              }
              onClick={() => {
                setSubjectBand("shs");
                setSubjectGrade("all");
              }}
            >
              Senior High (11–12)
            </Button>
          </div>

          <Toolbar
            addLabel="Add subject"
            onAdd={() => openModal("subjects")}
          >
            <div className="space-y-1">
              <Label className="text-xs">Grade</Label>
              <select
                value={subjectGrade}
                onChange={(e) => setSubjectGrade(e.target.value)}
                className={selectClass}
              >
                <option value="all">
                  All {subjectBand === "shs" ? "SHS" : "JHS"} grades
                </option>
                {subjectGradeOptions.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Search</Label>
              <Input
                value={subjectQ}
                onChange={(e) => setSubjectQ(e.target.value)}
                placeholder="Search subject…"
                className="h-9 w-44"
              />
            </div>
          </Toolbar>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Grade</TableHead>
                  {subjectBand === "shs" ? (
                    <TableHead>Track / Strand</TableHead>
                  ) : null}
                  <TableHead>Weights (W/P/E)</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubjects.length === 0 && (
                  <EmptyRow
                    colSpan={subjectBand === "shs" ? 5 : 4}
                    message={
                      subjectBand === "shs"
                        ? "No Senior High subjects found."
                        : "No Junior High subjects found."
                    }
                  />
                )}
                {filteredSubjects.map((s) => {
                  const w = normalizeComponentWeights(s);
                  return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.subject_name}
                    </TableCell>
                    <TableCell>G{s.grade_level}</TableCell>
                    {subjectBand === "shs" ? (
                      <TableCell>{s.track_strand || "—"}</TableCell>
                    ) : null}
                    <TableCell className="text-xs text-muted-foreground">
                      {w.written}/{w.performance}/{w.assessment}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 border-[#800000]/20 text-[#800000]"
                        onClick={() => {
                          setEditSubject(s);
                          setModal("editWeights");
                        }}
                      >
                        <Pencil className="size-3.5" />
                        Weights
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Showing {filteredSubjects.length} of {bandSubjectTotal}{" "}
            {subjectBand === "shs" ? "Senior High" : "Junior High"} subjects.
            Weights are shared with teacher class records (Written / Performance
            / Examinations).
          </p>
        </TabsContent>

        {/* SECTIONS */}
        <TabsContent value="sections" className="rounded-xl border bg-white p-4">
          <Toolbar addLabel="Add section" onAdd={() => openModal("sections")}>
            <div className="space-y-1">
              <Label className="text-xs">School year</Label>
              <select
                value={sectionYear}
                onChange={(e) => setSectionYear(e.target.value)}
                className={selectClass}
              >
                <option value="all">All years</option>
                {schoolYears.map((y) => (
                  <option key={y} value={y}>
                    SY {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Grade</Label>
              <select
                value={sectionGrade}
                onChange={(e) => setSectionGrade(e.target.value)}
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
              <Label className="text-xs">Search</Label>
              <Input
                value={sectionQ}
                onChange={(e) => setSectionQ(e.target.value)}
                placeholder="Search section…"
                className="h-9 w-44"
              />
            </div>
          </Toolbar>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section / Strand</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>School year</TableHead>
                  <TableHead>Adviser</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSections.length === 0 && (
                  <EmptyRow colSpan={4} message="No sections found." />
                )}
                {filteredSections.map((s) => {
                  const adv = teachers.find((t) => t.id === s.adviser_id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.section_name}
                      </TableCell>
                      <TableCell>G{s.grade_level}</TableCell>
                      <TableCell>{s.school_year}</TableCell>
                      <TableCell>
                        {adv
                          ? `${adv.profiles?.first_name || ""} ${adv.profiles?.last_name || ""}`.trim() ||
                            "TBA"
                          : "TBA"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Showing {filteredSections.length} of {sections.length} sections
          </p>
        </TabsContent>

        {/* ENROLL */}
        <TabsContent value="enroll" className="rounded-xl border bg-white p-4">
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
                      G{s.grade_level} {s.section_name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Search</Label>
              <Input
                value={enrollQ}
                onChange={(e) => setEnrollQ(e.target.value)}
                placeholder="Name or LRN…"
                className="h-9 w-44"
              />
            </div>
          </Toolbar>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
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
                    <TableCell className="font-medium">
                      {stu.profiles?.last_name}, {stu.profiles?.first_name}
                    </TableCell>
                    <TableCell>{stu.lrn}</TableCell>
                    <TableCell>{stu.gender}</TableCell>
                    <TableCell>{stu.grade_level}</TableCell>
                    <TableCell>
                      {stu.sections?.section_name || "—"}
                    </TableCell>
                    <TableCell>{stu.activation_status || "—"}</TableCell>
                    <TableCell>{stu.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Showing {filteredStudents.length} of {students.length} students
          </p>
        </TabsContent>

        {/* ASSIGN */}
        <TabsContent value="assign" className="rounded-xl border bg-white p-4">
          <Toolbar
            addLabel="Assign teacher"
            onAdd={() => openModal("assign")}
          >
            <div className="space-y-1">
              <Label className="text-xs">School year</Label>
              <select
                value={assignYear}
                onChange={(e) => setAssignYear(e.target.value)}
                className={selectClass}
              >
                <option value="all">All years</option>
                {schoolYears.map((y) => (
                  <option key={y} value={y}>
                    SY {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Search</Label>
              <Input
                value={assignQ}
                onChange={(e) => setAssignQ(e.target.value)}
                placeholder="Teacher, section, subject…"
                className="h-9 w-52"
              />
            </div>
          </Toolbar>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
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
                {filteredAssignments.length === 0 && (
                  <EmptyRow colSpan={5} message="No assignments found." />
                )}
                {filteredAssignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.teachers?.profiles?.first_name}{" "}
                      {a.teachers?.profiles?.last_name}
                    </TableCell>
                    <TableCell>
                      G{a.sections?.grade_level} {a.sections?.section_name}
                    </TableCell>
                    <TableCell>{a.subjects?.subject_name}</TableCell>
                    <TableCell>{a.school_year}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Showing {filteredAssignments.length} of {assignments.length}{" "}
            assignments
          </p>
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
              key={subjectBand}
              defaultBand={subjectBand}
              pending={pending}
              formError={formError}
              onSubmit={(payload) => submit(createSubject, payload)}
            />
          )}

          {modal === "editWeights" && editSubject ? (
            <>
              <DialogHeader>
                <DialogTitle>Edit grading weights</DialogTitle>
                <DialogDescription>
                  {editSubject.subject_name} · Grade {editSubject.grade_level}
                  {editSubject.track_strand
                    ? ` · ${editSubject.track_strand}`
                    : ""}
                  . Changes sync to teacher class records for this subject.
                </DialogDescription>
              </DialogHeader>
              <SubjectWeightsEditor
                subjectId={editSubject.id}
                subjectName={editSubject.subject_name}
                initialWeights={editSubject}
                onSaved={(weights) => {
                  setLocalSubjects((rows) =>
                    rows.map((row) =>
                      row.id === editSubject.id
                        ? {
                            ...row,
                            written_weight: weights.written,
                            performance_weight: weights.performance,
                            assessment_weight: weights.assessment,
                          }
                        : row
                    )
                  );
                  closeModal();
                }}
              />
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Close
                </DialogClose>
              </DialogFooter>
            </>
          ) : null}

          {modal === "sections" && (
            <AddSectionModal
              sections={sections}
              teachers={teachers}
              pending={pending}
              formError={formError}
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
                        G{s.grade_level} {s.section_name} ({s.school_year})
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
                  Link a teacher to a section and subject for a school year.
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
                  <Label>Section</Label>
                  <select name="sectionId" required className={selectClass}>
                    <option value="">Select section…</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        G{s.grade_level} {s.section_name} ({s.school_year})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <select name="subjectId" required className={selectClass}>
                    <option value="">Select subject…</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subject_name} (G{s.grade_level})
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
