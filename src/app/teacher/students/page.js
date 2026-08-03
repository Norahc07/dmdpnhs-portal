import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, GraduationCap, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth-guard";
import { getTeacherAccess } from "@/lib/teacher-access";
import {
  sealTeacherSectionToken,
  unsealTeacherSectionToken,
} from "@/lib/sealed-token";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const metadata = { title: "My Students" };

export default async function TeacherStudentsPage({ searchParams }) {
  const params = await searchParams;
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, teacher_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const teacherId = teacher?.id;

  const { data: assignments } = await supabase
    .from("teacher_assignments")
    .select(
      "id, school_year, sections(id, section_name, grade_level, school_year), subjects(id, subject_name)"
    )
    .eq("teacher_id", teacherId || "00000000-0000-0000-0000-000000000000");

  const { data: advisory } = await supabase
    .from("sections")
    .select("id, section_name, grade_level, school_year")
    .eq("adviser_id", teacherId || "00000000-0000-0000-0000-000000000000");

  // Unique sections the teacher can open (assignments + advisory)
  const sectionMap = new Map();
  for (const a of assignments || []) {
    const s = a.sections;
    if (!s?.id) continue;
    const existing = sectionMap.get(s.id) || {
      id: s.id,
      section_name: s.section_name,
      grade_level: s.grade_level,
      school_year: a.school_year || s.school_year,
      isAdvisory: false,
      subjects: [],
    };
    if (a.subjects?.subject_name) {
      existing.subjects.push(a.subjects.subject_name);
    }
    sectionMap.set(s.id, existing);
  }
  for (const s of advisory || []) {
    const existing = sectionMap.get(s.id) || {
      id: s.id,
      section_name: s.section_name,
      grade_level: s.grade_level,
      school_year: s.school_year,
      isAdvisory: true,
      subjects: [],
    };
    existing.isAdvisory = true;
    sectionMap.set(s.id, existing);
  }

  const sections = Array.from(sectionMap.values()).sort((a, b) => {
    const g = (a.grade_level || 0) - (b.grade_level || 0);
    if (g !== 0) return g;
    return String(a.section_name).localeCompare(String(b.section_name));
  });

  const allowedIds = new Set(sections.map((s) => s.id));

  // Legacy plain ?sectionId=… → upgrade to opaque ?s=… (never keep UUID in the URL)
  const legacySectionId = params.sectionId ? String(params.sectionId) : "";
  if (legacySectionId && teacherId) {
    if (allowedIds.has(legacySectionId)) {
      const token = sealTeacherSectionToken(legacySectionId, teacherId);
      redirect(`/teacher/students?s=${encodeURIComponent(token)}`);
    }
    redirect("/teacher/students");
  }

  // Encrypted opaque token in ?s=… (never expose raw section UUID)
  const sealed = params.s ? String(params.s) : "";
  let selectedId = null;
  let sealedOk = false;
  if (sealed && teacherId) {
    const opened = unsealTeacherSectionToken(sealed, teacherId);
    if (opened && allowedIds.has(opened)) {
      selectedId = opened;
      sealedOk = true;
    }
  }
  if (!selectedId) {
    selectedId = sections[0]?.id || null;
  }

  // Always keep the address bar on opaque ?s=… (upgrade legacy / bare / invalid URLs)
  if (selectedId && teacherId && !sealedOk) {
    const token = sealTeacherSectionToken(selectedId, teacherId);
    redirect(`/teacher/students?s=${encodeURIComponent(token)}`);
  }

  const selectedSection = sections.find((s) => s.id === selectedId) || null;

  const { data: students } = selectedId
    ? await supabase
        .from("students")
        .select(
          "id, lrn, gender, grade_level, status, activation_status, section_id, profiles(first_name, last_name), sections(section_name, grade_level)"
        )
        .eq("section_id", selectedId)
        .eq("activation_status", "active")
        .order("lrn")
    : { data: [] };

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
      title="My students & sections"
      subtitle="Click a section to view its active learner roster."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => {
          const active = s.id === selectedId;
          const token = teacherId
            ? sealTeacherSectionToken(s.id, teacherId)
            : "";
          return (
            <Link
              key={s.id}
              href={token ? `/teacher/students?s=${encodeURIComponent(token)}` : "/teacher/students"}
              className={cn(
                "rounded-2xl border bg-white px-4 py-3.5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] transition",
                active
                  ? "border-[#800000]/30 ring-2 ring-[#800000]/15"
                  : "border-[#800000]/10 hover:border-[#800000]/25 hover:bg-[#faf7f5]",
                s.isAdvisory &&
                  !active &&
                  "border-[#ffd700]/35 bg-linear-to-br from-[#ffd700]/12 to-white"
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    s.isAdvisory
                      ? "bg-[#ffd700]/25 text-[#6a4d00]"
                      : "bg-[#800000]/8 text-[#800000]"
                  )}
                >
                  {s.isAdvisory ? (
                    <ShieldCheck className="size-4" />
                  ) : (
                    <BookOpen className="size-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-wide text-[#800000] uppercase">
                    {s.isAdvisory ? "Advisory" : "Assigned"}
                    {active ? " · Viewing" : ""}
                  </p>
                  <p className="mt-1 font-medium text-[#3d1212]">
                    G{s.grade_level} {s.section_name}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {s.subjects.length
                      ? s.subjects.join(" · ")
                      : s.school_year || "Section roster"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
        {sections.length === 0 && (
          <p className="rounded-2xl border border-dashed border-[#800000]/20 bg-white px-4 py-8 text-center text-sm text-muted-foreground sm:col-span-2">
            No sections assigned yet. Ask the registrar to assign you under
            Academics.
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="portal-panel-head flex flex-wrap items-center gap-2 px-4 py-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[#800000]/8 text-[#800000]">
            <Users className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wide text-[#800000] uppercase">
              Roster
            </p>
            <p className="font-heading text-sm font-bold text-[#3d1212]">
              {selectedSection
                ? `Active learners · G${selectedSection.grade_level} ${selectedSection.section_name}`
                : "Select a section to view learners"}
            </p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-lg bg-[#800000]/8 px-2 py-1 text-xs font-semibold text-[#800000] ring-1 ring-[#800000]/12">
            <GraduationCap className="size-3.5" />
            {(students || []).length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#800000]/10 bg-[#800000]/5 hover:bg-[#800000]/5">
                <TableHead className="text-[#3d1212]">Name</TableHead>
                <TableHead className="text-[#3d1212]">LRN</TableHead>
                <TableHead className="text-[#3d1212]">Gender</TableHead>
                <TableHead className="text-[#3d1212]">Section</TableHead>
                <TableHead className="text-[#3d1212]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedId && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Click an assigned section above to load its roster.
                  </TableCell>
                </TableRow>
              )}
              {selectedId && (students || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No active students in this section yet.
                  </TableCell>
                </TableRow>
              )}
              {(students || []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-[#3d1212]">
                    {s.profiles?.last_name}, {s.profiles?.first_name}
                  </TableCell>
                  <TableCell>{s.lrn}</TableCell>
                  <TableCell>{s.gender}</TableCell>
                  <TableCell>
                    G{s.sections?.grade_level} {s.sections?.section_name}
                  </TableCell>
                  <TableCell>{s.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
