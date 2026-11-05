import { createAdminClient } from "@/lib/supabase/admin";
import { GRADE_WORKFLOW } from "@/lib/grade-workflow";
import { isSeniorHighGrade } from "@/lib/constants";
import { normalizeGradeTerm, termLabel } from "@/lib/grades-terms";
import { mapRegistrarGradeItem } from "@/lib/registrar-grades-tree";

function isJuniorHighGrade(gradeLevel) {
  const g = Number(gradeLevel);
  return g >= 7 && g <= 10;
}

function gradesForDepartment(dept) {
  if (dept?.grade_level != null && Number.isFinite(Number(dept.grade_level))) {
    return [Number(dept.grade_level)];
  }
  const band = String(dept?.band || "").toLowerCase();
  if (band === "shs") return [11, 12];
  if (band === "jhs") return [7, 8, 9, 10];
  return [];
}

function isCommitteeDepartment(dept, namedSubjectMatch) {
  if (namedSubjectMatch) return false;
  const name = String(dept?.name || "");
  return /department|committee|shs|jhs|senior|junior|all\s*subjects/i.test(name);
}

/**
 * Subjects a department head may validate.
 * - Linked subjects (subjects.department_id)
 * - Exact name match (legacy subject-named departments)
 * - Committee / band departments: subjects in the department grade band
 */
export function resolveDepartmentSubjectIds(dept, allSubjects = []) {
  if (!dept?.id) return [];

  const linked = allSubjects.filter((s) => s.department_id === dept.id);
  const named = allSubjects.filter(
    (s) =>
      String(s.subject_name || "").trim().toLowerCase() ===
      String(dept.name || "").trim().toLowerCase()
  );

  const ids = new Set([
    ...linked.map((s) => s.id),
    ...named.map((s) => s.id),
  ]);

  if (isCommitteeDepartment(dept, named.length > 0) || ids.size === 0) {
    const grades = gradesForDepartment(dept);
    for (const subject of allSubjects) {
      const g = Number(subject.grade_level);
      if (!grades.length) {
        if (String(dept.band || "").toLowerCase() === "shs" && isSeniorHighGrade(g)) {
          ids.add(subject.id);
        } else if (
          String(dept.band || "").toLowerCase() === "jhs" &&
          isJuniorHighGrade(g)
        ) {
          ids.add(subject.id);
        } else if (String(dept.band || "").toLowerCase() === "all") {
          ids.add(subject.id);
        }
        continue;
      }
      if (grades.includes(g)) ids.add(subject.id);
    }
  }

  return [...ids];
}

export function departmentCanReviewSubject(dept, subject) {
  if (!dept?.id || !subject) return false;
  if (subject.department_id && subject.department_id === dept.id) return true;
  if (
    String(dept.name || "").trim().toLowerCase() ===
    String(subject.subject_name || "").trim().toLowerCase()
  ) {
    return true;
  }
  const grades = gradesForDepartment(dept);
  const g = Number(subject.grade_level);
  if (grades.length && grades.includes(g)) {
    return (
      isCommitteeDepartment(dept, false) ||
      !subject.department_id ||
      subject.department_id === dept.id
    );
  }
  const band = String(dept.band || "").toLowerCase();
  if (band === "all") return true;
  if (band === "shs" && isSeniorHighGrade(g)) {
    return isCommitteeDepartment(dept, false) || !subject.department_id;
  }
  if (band === "jhs" && isJuniorHighGrade(g)) {
    return isCommitteeDepartment(dept, false) || !subject.department_id;
  }
  return false;
}

/**
 * Pending validation queue for a department head.
 * Uses admin after authorization — RLS only lets the encoding teacher read class_records.
 */
export async function loadDepartmentValidationQueue(departmentId) {
  if (!departmentId) {
    return { dept: null, items: [], error: "No department assigned." };
  }

  const admin = createAdminClient();
  const { data: dept, error: deptError } = await admin
    .from("departments")
    .select("id, name, grade_level, band")
    .eq("id", departmentId)
    .maybeSingle();

  if (deptError) return { dept: null, items: [], error: deptError.message };
  if (!dept) return { dept: null, items: [], error: "Department not found." };

  const { data: allSubjects, error: subjectError } = await admin
    .from("subjects")
    .select("id, subject_name, department_id, grade_level");
  if (subjectError) {
    return { dept, items: [], error: subjectError.message };
  }

  const subjectIds = resolveDepartmentSubjectIds(dept, allSubjects || []);
  if (!subjectIds.length) {
    return {
      dept,
      items: [],
      error: null,
      hint: "No subjects are linked to this department yet. Ask the registrar to set subject departments or use an SHS/JHS committee department.",
    };
  }

  const { data: assignments, error: assignmentError } = await admin
    .from("teacher_assignments")
    .select("id, section_id, subject_id, school_year, teacher_id")
    .in("subject_id", subjectIds);
  if (assignmentError) {
    return { dept, items: [], error: assignmentError.message };
  }

  const assignmentRows = assignments || [];
  if (!assignmentRows.length) {
    return { dept, items: [], error: null };
  }

  const assignmentIds = assignmentRows.map((a) => a.id);
  const { data: records, error: recordError } = await admin
    .from("class_records")
    .select(
      "id, assignment_id, term, workflow_status, review_notes, submitted_at, data"
    )
    .in("assignment_id", assignmentIds)
    .in("workflow_status", [
      GRADE_WORKFLOW.UNDER_REVIEW,
      GRADE_WORKFLOW.SUBMITTED,
    ])
    .order("submitted_at", { ascending: true });

  if (recordError) {
    return { dept, items: [], error: recordError.message };
  }

  const pending = records || [];
  if (!pending.length) return { dept, items: [], error: null };

  const sectionIds = [
    ...new Set(assignmentRows.map((a) => a.section_id).filter(Boolean)),
  ];
  const teacherIds = [
    ...new Set(assignmentRows.map((a) => a.teacher_id).filter(Boolean)),
  ];
  const usedSubjectIds = [
    ...new Set(assignmentRows.map((a) => a.subject_id).filter(Boolean)),
  ];

  const [{ data: sections }, { data: teachers }, { data: subjects }] =
    await Promise.all([
      sectionIds.length
        ? admin
            .from("sections")
            .select("id, section_name, grade_level, school_year, track_strand")
            .in("id", sectionIds)
        : Promise.resolve({ data: [] }),
      teacherIds.length
        ? admin
            .from("teachers")
            .select("id, profile_id, teacher_id")
            .in("id", teacherIds)
        : Promise.resolve({ data: [] }),
      usedSubjectIds.length
        ? admin
            .from("subjects")
            .select(
              "id, subject_name, written_weight, performance_weight, assessment_weight, department_id, grade_level"
            )
            .in("id", usedSubjectIds)
        : Promise.resolve({ data: [] }),
    ]);

  const profileIds = [
    ...new Set((teachers || []).map((t) => t.profile_id).filter(Boolean)),
  ];
  let profilesById = new Map();
  if (profileIds.length) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", profileIds);
    profilesById = new Map((profiles || []).map((p) => [p.id, p]));
  }

  const sectionById = new Map((sections || []).map((s) => [s.id, s]));
  const subjectById = new Map((subjects || []).map((s) => [s.id, s]));
  const teacherById = new Map(
    (teachers || []).map((t) => [
      t.id,
      {
        ...t,
        profiles: t.profile_id ? profilesById.get(t.profile_id) || null : null,
      },
    ])
  );
  const assignmentById = new Map(
    assignmentRows.map((a) => [
      a.id,
      {
        ...a,
        sections: sectionById.get(a.section_id) || null,
        subjects: subjectById.get(a.subject_id) || null,
        teachers: teacherById.get(a.teacher_id) || null,
      },
    ])
  );

  const studentIds = new Set();
  for (const r of pending) {
    for (const id of Object.keys(r.data?.students || {})) studentIds.add(id);
  }

  const studentDirectory = {};
  if (studentIds.size) {
    const { data: studentRows } = await admin
      .from("students")
      .select("id, lrn, profile_id")
      .in("id", Array.from(studentIds));
    const stuProfileIds = [
      ...new Set((studentRows || []).map((s) => s.profile_id).filter(Boolean)),
    ];
    let stuProfiles = new Map();
    if (stuProfileIds.length) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", stuProfileIds);
      stuProfiles = new Map((profiles || []).map((p) => [p.id, p]));
    }
    for (const s of studentRows || []) {
      const profile = s.profile_id ? stuProfiles.get(s.profile_id) : null;
      studentDirectory[s.id] = {
        lrn: s.lrn,
        first_name: profile?.first_name,
        last_name: profile?.last_name,
      };
    }
  }

  const items = pending.map((r) => {
    const assignment = assignmentById.get(r.assignment_id) || null;
    const mapped = mapRegistrarGradeItem(
      {
        assignment_id: r.assignment_id,
        teacher_assignments: assignment,
        class_records: { ...r, term: normalizeGradeTerm(r.term) },
      },
      studentDirectory
    );
    return {
      ...mapped,
      term: normalizeGradeTerm(r.term),
      term_label: termLabel(r.term),
      item_key: `${r.assignment_id}-${normalizeGradeTerm(r.term)}`,
    };
  });

  return { dept, items, error: null };
}
