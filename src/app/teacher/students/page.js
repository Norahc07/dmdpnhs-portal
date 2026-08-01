import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth-guard";
import { getTeacherAccess } from "@/lib/teacher-access";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "My Students" };

export default async function TeacherStudentsPage() {
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

  const sectionIds = [
    ...new Set(
      [
        ...(assignments || []).map((a) => a.sections?.id),
        ...(advisory || []).map((s) => s.id),
      ].filter(Boolean)
    ),
  ];

  const { data: students } =
    sectionIds.length > 0
      ? await supabase
          .from("students")
          .select(
            "id, lrn, gender, grade_level, status, activation_status, section_id, profiles(first_name, last_name), sections(section_name, grade_level)"
          )
          .in("section_id", sectionIds)
          .eq("activation_status", "active")
          .order("lrn")
      : { data: [] };

  return (
    <AppShell
      role="teacher"
      profile={profile}
      teacherAccess={teacherAccess}
      title="My students & sections"
      subtitle="Learners enrolled by the registrar in sections you handle (assignments + advisory)."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(assignments || []).map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-[#800000]/10 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-xs font-semibold tracking-wide text-[#800000] uppercase">
              Assigned
            </p>
            <p className="mt-1 font-medium text-[#3d1212]">
              G{a.sections?.grade_level} {a.sections?.section_name}
            </p>
            <p className="text-sm text-muted-foreground">
              {a.subjects?.subject_name} · {a.school_year}
            </p>
          </div>
        ))}
        {(advisory || []).map((s) => (
          <div
            key={`adv-${s.id}`}
            className="rounded-xl border border-[#ffd700]/40 bg-[#ffd700]/10 px-4 py-3"
          >
            <p className="text-xs font-semibold tracking-wide text-[#800000] uppercase">
              Advisory
            </p>
            <p className="mt-1 font-medium text-[#3d1212]">
              G{s.grade_level} {s.section_name}
            </p>
            <p className="text-sm text-muted-foreground">{s.school_year}</p>
          </div>
        ))}
        {(assignments || []).length === 0 && (advisory || []).length === 0 && (
          <p className="text-sm text-muted-foreground sm:col-span-2">
            No sections assigned yet. Ask the registrar to assign you under
            Academics.
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>LRN</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(students || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No active students in your sections yet.
                </TableCell>
              </TableRow>
            )}
            {(students || []).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
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
    </AppShell>
  );
}
