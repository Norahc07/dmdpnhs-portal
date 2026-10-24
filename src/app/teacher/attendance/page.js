import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AttendanceDetailControls } from "@/components/teacher/AttendanceDetailControls";
import { AttendancePanel } from "@/components/teacher/AttendancePanel";
import { AttendanceSectionCards } from "@/components/teacher/AttendanceSectionCards";
import { requireRole } from "@/lib/auth-guard";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import {
  sealTeacherSectionToken,
  unsealTeacherSectionToken,
} from "@/lib/sealed-token";
import { getTeacherAccess } from "@/lib/teacher-access";
import {
  filterHumssAttendanceSubjects,
  isHumssGrade12,
} from "@/lib/humss-academic-record";

export const metadata = { title: "Attendance" };

function attendanceHref({ token, date, subjectId }) {
  const q = new URLSearchParams();
  if (token) q.set("s", token);
  if (date) q.set("date", date);
  if (subjectId) q.set("subjectId", subjectId);
  const qs = q.toString();
  return qs ? `/teacher/attendance?${qs}` : "/teacher/attendance";
}

export default async function TeacherAttendancePage({ searchParams }) {
  const params = await searchParams;
  const { supabase, profile } = await requireRole("teacher");
  const teacherAccess = await getTeacherAccess(supabase, profile.id);

  const today = new Date().toISOString().slice(0, 10);
  const date = String(params.date || today).slice(0, 10);

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const teacherId = teacher?.id;

  let assignments = [];
  if (teacherId) {
    const withAdviser = await supabase
      .from("teacher_assignments")
      .select(
        "id, section_id, subject_id, school_year, sections(id, section_name, grade_level, school_year, adviser_id, track_strand), subjects(id, subject_name, grade_level, track_strand)"
      )
      .eq("teacher_id", teacherId)
      .eq("school_year", SCHOOL_YEAR_DEFAULT);

    if (withAdviser.error) {
      const fallback = await supabase
        .from("teacher_assignments")
        .select(
          "id, section_id, subject_id, school_year, sections(id, section_name, grade_level, school_year, track_strand), subjects(id, subject_name, grade_level, track_strand)"
        )
        .eq("teacher_id", teacherId)
        .eq("school_year", SCHOOL_YEAR_DEFAULT);
      assignments = fallback.data || [];
    } else {
      assignments = withAdviser.data || [];
    }
  }

  let advisory = [];
  if (teacherId) {
    const adv = await supabase
      .from("sections")
      .select("id, section_name, grade_level, school_year, track_strand")
      .eq("adviser_id", teacherId)
      .eq("school_year", SCHOOL_YEAR_DEFAULT);
    if (!adv.error) advisory = adv.data || [];
  }

  const sectionMap = new Map();
  for (const a of assignments) {
    const s = a.sections;
    if (!s?.id) continue;
    const existing = sectionMap.get(s.id) || {
      id: s.id,
      section_name: s.section_name,
      grade_level: s.grade_level,
      school_year: a.school_year || s.school_year,
      isAdvisory: s.adviser_id === teacherId,
      track_strand: s.track_strand,
      subjects: [],
      subjectRows: [],
      studentCount: 0,
    };
    if (a.subjects?.subject_name) {
      if (!existing.subjects.includes(a.subjects.subject_name)) {
        existing.subjects.push(a.subjects.subject_name);
      }
    }
    if (a.subjects?.id) {
      if (!existing.subjectRows.some((row) => row.id === a.subjects.id)) {
        existing.subjectRows.push(a.subjects);
      }
    }
    existing.track_strand = existing.track_strand || s.track_strand;
    sectionMap.set(s.id, existing);
  }
  for (const s of advisory) {
    const existing = sectionMap.get(s.id) || {
      id: s.id,
      section_name: s.section_name,
      grade_level: s.grade_level,
      school_year: s.school_year,
      isAdvisory: true,
      track_strand: s.track_strand,
      subjects: [],
      subjectRows: [],
      studentCount: 0,
    };
    existing.isAdvisory = true;
    sectionMap.set(s.id, existing);
  }

  const sectionIds = Array.from(sectionMap.keys());
  if (sectionIds.length) {
    const { data: studentRows } = await supabase
      .from("students")
      .select("id, section_id")
      .in("section_id", sectionIds)
      .eq("activation_status", "active");
    const counts = {};
    for (const row of studentRows || []) {
      counts[row.section_id] = (counts[row.section_id] || 0) + 1;
    }
    for (const [id, section] of sectionMap) {
      section.studentCount = counts[id] || 0;
      const token = teacherId
        ? sealTeacherSectionToken(id, teacherId)
        : "";
      section.href = attendanceHref({ token, date });
    }
  }

  const sections = Array.from(sectionMap.values()).sort((a, b) => {
    const g = (a.grade_level || 0) - (b.grade_level || 0);
    if (g !== 0) return g;
    return String(a.section_name).localeCompare(String(b.section_name));
  });

  const humssNeedingSubjects = sections.filter(
    (section) => isHumssGrade12(section) && !section.subjectRows.length
  );
  if (humssNeedingSubjects.length) {
    const { data: humssSubjects } = await supabase
      .from("subjects")
      .select("id, subject_name, grade_level, track_strand")
      .eq("grade_level", 12)
      .eq("track_strand", "HUMSS");
    const termTwo = filterHumssAttendanceSubjects(humssSubjects || []);
    for (const section of humssNeedingSubjects) {
      section.subjectRows = termTwo;
      section.subjects = termTwo.map((row) => row.subject_name);
    }
  }
  for (const section of sections) {
    if (!isHumssGrade12(section)) continue;
    section.subjectRows = filterHumssAttendanceSubjects(section.subjectRows);
    section.subjects = section.subjectRows.map((row) => row.subject_name);
  }

  const allowedIds = new Set(sections.map((s) => s.id));

  // Legacy ?sectionId= → sealed ?s=
  const legacySectionId = params.sectionId ? String(params.sectionId) : "";
  if (legacySectionId && teacherId) {
    if (allowedIds.has(legacySectionId)) {
      const token = sealTeacherSectionToken(legacySectionId, teacherId);
      redirect(
        attendanceHref({
          token,
          date,
          subjectId: params.subjectId ? String(params.subjectId) : "",
        })
      );
    }
    redirect("/teacher/attendance");
  }

  const sealed = params.s ? String(params.s) : "";
  let selectedId = null;
  if (sealed && teacherId) {
    const opened = unsealTeacherSectionToken(sealed, teacherId);
    if (opened && allowedIds.has(opened)) {
      selectedId = opened;
    }
    // Invalid/expired token → show cards (no redirect loop)
  }

  if (!selectedId) {
    return (
      <AppShell
        role="teacher"
        profile={profile}
        teacherAccess={teacherAccess}
        title="Smart Attendance"
        subtitle="Choose a section you handle, then mark Present, Late, Absent, or Excused. HUMSS uses Term 2 subjects."
      >
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link href="/teacher" className="hover:text-[#800000]">
            Teacher
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="font-medium text-[#3d1212]">Attendance</span>
        </nav>
        <AttendanceSectionCards sections={sections} />
      </AppShell>
    );
  }

  const selectedSection = sections.find((s) => s.id === selectedId);
  const humssSection = isHumssGrade12(selectedSection);
  const subjectId = params.subjectId ? String(params.subjectId) : "";
  const subjectsForSection = selectedSection?.subjectRows || [];
  const selectedSubject =
    subjectsForSection.find((s) => s.id === subjectId) || null;

  if (humssSection && subjectsForSection.length && !selectedSubject) {
    redirect(
      attendanceHref({
        token: sealed,
        date,
        subjectId: subjectsForSection[0].id,
      })
    );
  }

  const effectiveSubjectId = selectedSubject ? subjectId : "";

  const sealedToken = sealTeacherSectionToken(selectedId, teacherId);
  const sectionLabel = selectedSection
    ? `Grade ${selectedSection.grade_level} · ${selectedSection.section_name}`
    : "Section";

  const { data: students } = await supabase
    .from("students")
    .select("id, lrn, profiles(first_name, last_name)")
    .eq("section_id", selectedId)
    .eq("activation_status", "active")
    .order("lrn");

  let attendanceQuery = supabase
    .from("attendance")
    .select("id, student_id, status, subject_id")
    .eq("section_id", selectedId)
    .eq("date", date);

  if (effectiveSubjectId) {
    attendanceQuery = attendanceQuery.eq("subject_id", effectiveSubjectId);
  } else {
    attendanceQuery = attendanceQuery.is("subject_id", null);
  }

  let { data: attendance, error: attError } = await attendanceQuery;

  if (attError && /subject_id/i.test(String(attError.message || ""))) {
    const fallback = await supabase
      .from("attendance")
      .select("id, student_id, status")
      .eq("section_id", selectedId)
      .eq("date", date);
    attendance = fallback.data;
  }

  const initialMap = Object.fromEntries(
    (attendance || []).map((a) => [a.student_id, a.status])
  );

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
      title="Smart Attendance"
      subtitle={`${sectionLabel} · mark present, late, absent, or excused.`}
    >
      <div className="space-y-4">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link href="/teacher" className="hover:text-[#800000]">
            Teacher
          </Link>
          <ChevronRight className="size-3.5" />
          <Link href="/teacher/attendance" className="hover:text-[#800000]">
            Attendance
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="font-medium text-[#3d1212]">{sectionLabel}</span>
          {selectedSubject ? (
            <>
              <ChevronRight className="size-3.5" />
              <span className="font-medium text-[#3d1212]">
                {selectedSubject.subject_name}
              </span>
            </>
          ) : null}
        </nav>

        <Link
          href="/teacher/attendance"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#800000] hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to class cards
        </Link>

        <AttendanceDetailControls
          sealedToken={sealedToken}
          date={date}
          subjects={subjectsForSection}
          subjectId={effectiveSubjectId}
          hideHomeroom={humssSection}
          periodHeading={
            humssSection ? "Term 2 attendance subjects" : "Subject period"
          }
        />

        <AttendancePanel
          key={`${selectedId}-${effectiveSubjectId || "homeroom"}-${date}`}
          students={students || []}
          sectionId={selectedId}
          subjectId={effectiveSubjectId || null}
          date={date}
          initialMap={initialMap}
          sectionLabel={sectionLabel}
          subjectLabel={
            selectedSubject?.subject_name ||
            (humssSection ? "Select a Term 2 subject" : "Daily / Homeroom")
          }
        />
      </div>
    </AppShell>
  );
}
