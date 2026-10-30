"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { enrollStudentByRegistrar } from "@/actions/activation";
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
import { SearchInput } from "@/components/ui/search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GRADE_LEVELS,
  SCHOOL_YEAR_DEFAULT,
  STATUS_BADGE_STYLES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-9 text-sm";

function activationBadgeClass(status) {
  const key = String(status || "").toLowerCase();
  return (
    STATUS_BADGE_STYLES[key] ||
    "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200"
  );
}

export function EnrollmentTable({ students, sections, loadError = "" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [formGrade, setFormGrade] = useState("7");
  const [formSection, setFormSection] = useState("");

  const schoolYears = useMemo(() => {
    const years = new Set(sections.map((s) => s.school_year).filter(Boolean));
    years.add(SCHOOL_YEAR_DEFAULT);
    return Array.from(years).sort().reverse();
  }, [sections]);

  const [search, setSearch] = useState("");
  // Show every enrolled learner by default; SY filter is optional.
  const [schoolYear, setSchoolYear] = useState("all");
  const [gradeLevel, setGradeLevel] = useState("all");
  const [sectionId, setSectionId] = useState("all");
  const [gender, setGender] = useState("all");
  const [activationFilter, setActivationFilter] = useState("all");

  const sectionById = useMemo(
    () => Object.fromEntries(sections.map((s) => [s.id, s])),
    [sections]
  );

  const filteredSections = sections.filter((s) => {
    if (schoolYear !== "all" && s.school_year !== schoolYear) return false;
    if (gradeLevel !== "all" && String(s.grade_level) !== String(gradeLevel)) {
      return false;
    }
    return true;
  });

  const enrollSections = useMemo(() => {
    return sections
      .filter(
        (s) =>
          s.school_year === SCHOOL_YEAR_DEFAULT &&
          String(s.grade_level) === String(formGrade)
      )
      .sort((a, b) =>
        String(a.section_name).localeCompare(String(b.section_name))
      );
  }, [sections, formGrade]);

  const searchQ = search.trim().toLowerCase();

  const rows = students.filter((stu) => {
    if (gradeLevel !== "all" && String(stu.grade_level) !== String(gradeLevel)) {
      return false;
    }
    if (sectionId !== "all" && stu.section_id !== sectionId) return false;
    if (gender !== "all" && stu.gender !== gender) return false;
    if (
      activationFilter !== "all" &&
      String(stu.activation_status || "") !== activationFilter
    ) {
      return false;
    }

    if (schoolYear !== "all" && stu.section_id) {
      const s = sectionById[stu.section_id];
      // Keep row if section missing from list (stale id) — still show the learner
      if (s && s.school_year !== schoolYear) return false;
    }

    if (searchQ) {
      const hay = `${stu.profiles?.first_name || ""} ${stu.profiles?.last_name || ""} ${stu.lrn || ""}`;
      if (!hay.toLowerCase().includes(searchQ)) return false;
    }
    return true;
  });

  const learnersInOtherYears = useMemo(() => {
    if (schoolYear === "all") return 0;
    return students.filter((stu) => {
      if (!stu.section_id) return false;
      const s = sectionById[stu.section_id];
      return s && s.school_year && s.school_year !== schoolYear;
    }).length;
  }, [students, sectionById, schoolYear]);

  const totalsByGrade = GRADE_LEVELS.map((g) => {
    const inGrade = rows.filter((r) => Number(r.grade_level) === g);
    return {
      grade: g,
      total: inGrade.length,
      male: inGrade.filter((r) => r.gender === "Male").length,
      female: inGrade.filter((r) => r.gender === "Female").length,
    };
  });

  const filteredMale = rows.filter((r) => r.gender === "Male").length;
  const filteredFemale = rows.filter((r) => r.gender === "Female").length;
  const incompleteCount = students.filter(
    (s) => s.activation_status === "incomplete"
  ).length;

  function submitEnroll(formData) {
    setFormError("");
    startTransition(async () => {
      const result = await enrollStudentByRegistrar(
        Object.fromEntries(formData)
      );
      if (result?.error) {
        setFormError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(
        result?.message ||
          "Student enrolled. They can activate with LRN + birthdate."
      );
      setEnrollOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {loadError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="rounded-2xl border border-[#800000]/10 bg-white px-4 py-3 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.28)] sm:max-w-xl">
          <p className="text-sm font-semibold text-[#3d1212]">
            Enroll learners
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Showing {students.length} enrolled learner
            {students.length === 1 ? "" : "s"} (excluding Trash). New students
            appear under Activations → Awaiting until they submit
            personal/guardian details and you verify them. Sign-in is LRN and
            birthdate (YYYYMMDD). Incomplete stubs:{" "}
            <span className="font-semibold text-[#800000]">{incompleteCount}</span>
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setFormError("");
            setFormGrade("7");
            setFormSection("");
            setEnrollOpen(true);
          }}
          className="bg-[#800000] hover:bg-[#6a0000]"
        >
          <UserPlus className="size-4" />
          Enroll student
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or LRN…"
          className="w-full min-w-[14rem] sm:w-64"
          aria-label="Search enrollment by name or LRN"
        />
        <select
          value={schoolYear}
          onChange={(e) => {
            setSchoolYear(e.target.value);
            setSectionId("all");
          }}
          className="h-9 rounded-md border pl-3 pr-9 text-sm"
        >
          <option value="all">All school years</option>
          {schoolYears.map((y) => (
            <option key={y} value={y}>
              SY {y}
            </option>
          ))}
        </select>
        <select
          value={gradeLevel}
          onChange={(e) => {
            setGradeLevel(e.target.value);
            setSectionId("all");
          }}
          className="h-9 rounded-md border pl-3 pr-9 text-sm"
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
          className="h-9 rounded-md border pl-3 pr-9 text-sm"
        >
          <option value="all">All sections</option>
          {filteredSections.map((s) => (
            <option key={s.id} value={s.id}>
              Grade {s.grade_level} · {s.section_name}
              {s.track_strand ? ` · ${s.track_strand}` : ""}
            </option>
          ))}
        </select>
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="h-9 rounded-md border pl-3 pr-9 text-sm"
        >
          <option value="all">All genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        <select
          value={activationFilter}
          onChange={(e) => setActivationFilter(e.target.value)}
          className="h-9 rounded-md border pl-3 pr-9 text-sm"
        >
          <option value="all">All activation</option>
          <option value="incomplete">Incomplete (ready to activate)</option>
          <option value="pending">Pending approval</option>
          <option value="active">Active</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 lg:gap-2.5">
        {totalsByGrade.map((t) => (
          <div
            key={t.grade}
            className="rounded-2xl border border-[#800000]/10 bg-white px-3 py-3 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]"
          >
            <p className="text-[10px] font-semibold tracking-wide text-[#800000] uppercase sm:text-xs">
              Grade {t.grade}
            </p>
            <p className="mt-1 text-xl font-bold text-[#3d1212] sm:text-2xl">
              {t.total}
            </p>
            <p className="text-[10px] text-muted-foreground sm:text-xs">
              M {t.male} · F {t.female}
            </p>
          </div>
        ))}
        <div className="rounded-2xl border border-[#ffd700]/40 bg-[#ffd700]/10 px-3 py-3 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <p className="text-[10px] font-semibold tracking-wide text-[#800000] uppercase sm:text-xs">
            Filtered total
          </p>
          <p className="mt-1 text-xl font-bold text-[#3d1212] sm:text-2xl">
            {rows.length}
          </p>
          <p className="text-[10px] text-muted-foreground sm:text-xs">
            M {filteredMale} · F {filteredFemale}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
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
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  {learnersInOtherYears > 0 ? (
                    <>
                      No enrollment records for SY {schoolYear}.{" "}
                      {learnersInOtherYears} learner
                      {learnersInOtherYears === 1 ? "" : "s"} are in another
                      school year — switch the SY filter above.
                    </>
                  ) : (
                    "No enrollment records for these filters."
                  )}
                </TableCell>
              </TableRow>
            )}
            {rows.map((stu) => {
              const sec = stu.section_id ? sectionById[stu.section_id] : null;
              const act = stu.activation_status || "—";
              return (
                <TableRow key={stu.id}>
                  <TableCell className="font-medium">
                    {stu.profiles?.first_name} {stu.profiles?.last_name}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{stu.lrn}</TableCell>
                  <TableCell>{stu.gender}</TableCell>
                  <TableCell>{stu.grade_level}</TableCell>
                  <TableCell>
                    {sec
                      ? `${sec.section_name}${
                          sec.school_year ? ` · ${sec.school_year}` : ""
                        }`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-0 capitalize",
                        activationBadgeClass(act)
                      )}
                    >
                      {act}
                    </Badge>
                  </TableCell>
                  <TableCell>{stu.status}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enroll student</DialogTitle>
            <DialogDescription>
              Creates an enrolled learner stub (LRN + birthdate). The student
              activates at /register/student, then completes their profile.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              submitEnroll(new FormData(e.currentTarget));
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="enroll-lrn">LRN (12 digits)</Label>
              <Input
                id="enroll-lrn"
                name="lrn"
                required
                maxLength={12}
                inputMode="numeric"
                placeholder="12-digit LRN"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enroll-birthdate">Birthdate</Label>
              <Input
                id="enroll-birthdate"
                name="birthdate"
                type="date"
                required
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enroll-first">First name</Label>
              <Input
                id="enroll-first"
                name="firstName"
                required
                placeholder="e.g. Juan"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enroll-last">Last name</Label>
              <Input
                id="enroll-last"
                name="lastName"
                required
                placeholder="e.g. Dela Cruz"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enroll-gender">Gender</Label>
              <select
                id="enroll-gender"
                name="gender"
                required
                defaultValue="Male"
                className={selectClass}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enroll-grade">Grade level</Label>
              <select
                id="enroll-grade"
                name="gradeLevel"
                required
                value={formGrade}
                onChange={(e) => {
                  setFormGrade(e.target.value);
                  setFormSection("");
                }}
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
              <Label htmlFor="enroll-parent-first">
                Parent / guardian first name
              </Label>
              <Input
                id="enroll-parent-first"
                name="parentFirstName"
                required
                placeholder="e.g. Maria"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enroll-parent-last">
                Parent / guardian last name
              </Label>
              <Input
                id="enroll-parent-last"
                name="parentLastName"
                required
                placeholder="e.g. Dela Cruz"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enroll-parent-phone">
                Parent / guardian contact number
              </Label>
              <Input
                id="enroll-parent-phone"
                name="parentPhone"
                required
                placeholder="09XXXXXXXXX"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="enroll-section">Section</Label>
              <select
                id="enroll-section"
                name="sectionId"
                required={enrollSections.length > 0}
                value={formSection}
                onChange={(e) => setFormSection(e.target.value)}
                className={selectClass}
              >
                <option value="">
                  {enrollSections.length
                    ? "Select section"
                    : "No sections for this grade"}
                </option>
                {enrollSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.section_name} ({s.school_year})
                    {s.track_strand ? ` · ${s.track_strand}` : ""}
                  </option>
                ))}
              </select>
              {!enrollSections.length ? (
                <p className="text-xs text-rose-600">
                  Create a Grade {formGrade} section in Academics before
                  enrolling.
                </p>
              ) : null}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
