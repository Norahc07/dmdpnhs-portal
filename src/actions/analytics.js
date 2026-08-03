"use server";

import { createClient } from "@/lib/supabase/server";
import { SCHOOL_YEAR_DEFAULT } from "@/lib/constants";
import {
  getSampleAnalyticsCharts,
  getSampleAnalyticsKpis,
} from "@/lib/registrar-analytics-sample";
import { ensureRegistrarOpsDemoData } from "@/lib/ensure-registrar-ops-demo";

function normalizeTrack(track) {
  const t = String(track || "").toLowerCase();
  if (!t) return null;
  if (t.includes("ict")) return "ICT";
  if (t.includes("cook") || t.includes("fcs")) return "FCS / Cookery";
  if (t.includes("afa") || t.includes("agri") || t.includes("fishery")) {
    return "AFA";
  }
  if (t.includes("draft")) return "Drafting";
  return null;
}

function buildingFromLocation(location) {
  const loc = String(location || "").trim();
  if (!loc) return "Unspecified";
  const base = loc.split(",")[0].trim();
  // Collapse numbered building details into a building family label
  if (/megawide/i.test(base)) return "Megawide Bldg.";
  if (/\bfql\b/i.test(base)) return "FQL Bldg.";
  if (/chinese chamber/i.test(base)) return "Chinese Chamber Bldg.";
  if (/\brpn\b/i.test(base)) return "RPN Bldg.";
  if (/\brpb\b/i.test(base)) return "RPB Bldg.";
  if (/sned/i.test(base)) return "SNED DepEd Bldg.";
  if (/deped/i.test(base)) return "DepEd Bldg.";
  return base || "Unspecified";
}

function isSnedSection(section) {
  const name = String(section?.section_name || "").toUpperCase();
  return name.includes("LWD") || name.includes("SNED");
}

function gradeBand(finalGrade) {
  const g = Number(finalGrade);
  if (!Number.isFinite(g)) return null;
  if (g >= 90) return "outstanding";
  if (g >= 85) return "verySatisfactory";
  if (g >= 80) return "satisfactory";
  if (g >= 75) return "fairlySatisfactory";
  return "didNotMeet";
}

function sectionHeadcount(section) {
  return (Number(section.male_count) || 0) + (Number(section.female_count) || 0);
}

/**
 * Aggregated registrar dashboard metrics + chart series from live Supabase data.
 * Falls back to section roster headcounts and sample chart series when portal
 * student/grade rows are still sparse.
 */
export async function getRegistrarDashboardAnalytics(
  schoolYear = SCHOOL_YEAR_DEFAULT
) {
  // Optional: REGISTRAR_OPS_DEMO=1 seeds demo queues (off by default for speed).
  await ensureRegistrarOpsDemoData();

  const supabase = await createClient();
  const year = String(schoolYear || SCHOOL_YEAR_DEFAULT).trim();
  const sampleCharts = getSampleAnalyticsCharts();

  const [
    sectionsRes,
    studentsRes,
    pendingTeachersRes,
    pendingActivationsRes,
    lockedGradesRes,
    docsRes,
    gradesRes,
  ] = await Promise.all([
    supabase
      .from("sections")
      .select(
        "id, section_name, grade_level, school_year, track_strand, location, capacity, male_count, female_count"
      )
      .eq("school_year", year),
    supabase
      .from("students")
      .select("id, gender, grade_level, section_id, status, activation_status"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "teacher")
      .eq("status", "pending"),
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("activation_status", "pending"),
    supabase
      .from("class_records")
      .select("*", { count: "exact", head: true })
      .eq("workflow_status", "locked"),
    supabase.from("document_requests").select("id, document_type, status"),
    supabase
      .from("grades")
      .select("student_id, final_transmuted_grade, school_year")
      .eq("school_year", year),
  ]);

  let grades = gradesRes.data || [];
  if (gradesRes.error && /school_year/i.test(String(gradesRes.error.message || ""))) {
    const fallback = await supabase
      .from("grades")
      .select("student_id, final_transmuted_grade");
    grades = (fallback.data || []).map((row) => ({
      ...row,
      school_year: year,
    }));
  }

  const sections = sectionsRes.data || [];
  const sectionIds = new Set(sections.map((s) => s.id));
  const snedSectionIds = new Set(
    sections.filter(isSnedSection).map((s) => s.id)
  );

  const allStudents = studentsRes.data || [];
  const enrolledInYear = allStudents.filter(
    (s) => s.section_id && sectionIds.has(s.section_id)
  );
  const learnerPool =
    enrolledInYear.length > 0
      ? enrolledInYear
      : allStudents.filter(
          (s) =>
            s.status === "enrolled" || s.activation_status === "active"
        );

  // Prefer live enrolled student rows so dashboard matches Enrollment /
  // Grades pages. Section male/female headcounts are synced from students
  // by ensureGradeLockDemoData — do not prefer inflated roster placeholders.
  const rosterMale = sections.reduce(
    (sum, s) => sum + (Number(s.male_count) || 0),
    0
  );
  const rosterFemale = sections.reduce(
    (sum, s) => sum + (Number(s.female_count) || 0),
    0
  );
  const rosterTotal = rosterMale + rosterFemale;
  const useRoster = learnerPool.length === 0 && rosterTotal > 0;

  const male = useRoster
    ? rosterMale
    : learnerPool.filter((s) => s.gender === "Male").length;
  const female = useRoster
    ? rosterFemale
    : learnerPool.filter((s) => s.gender === "Female").length;
  const totalEnrolled = useRoster ? rosterTotal : learnerPool.length;

  const snedCount = useRoster
    ? sections
        .filter((s) => snedSectionIds.has(s.id))
        .reduce((sum, s) => sum + sectionHeadcount(s), 0)
    : learnerPool.filter(
        (s) => s.section_id && snedSectionIds.has(s.section_id)
      ).length;

  let eosy = {
    promoted: allStudents.filter((s) => s.status === "promoted").length,
    retained: allStudents.filter((s) => s.status === "retained").length,
    remedial: allStudents.filter((s) => s.status === "remedial").length,
  };
  const eosyTotal = eosy.promoted + eosy.retained + eosy.remedial;
  let usedSample = false;

  const docs = docsRes.data || [];
  let docQueue = {
    pending: docs.filter((d) => d.status === "Pending").length,
    processing: docs.filter((d) => d.status === "Processing").length,
    ready: docs.filter((d) => d.status === "Ready for Pickup").length,
    total: docs.length,
  };

  // Chart 1: enrollment by grade × gender (JHS 7–10 + SHS 11–12)
  let enrollmentByGrade = [7, 8, 9, 10, 11, 12].map((grade) => {
    if (useRoster) {
      const inGrade = sections.filter((s) => Number(s.grade_level) === grade);
      const m = inGrade.reduce((sum, s) => sum + (Number(s.male_count) || 0), 0);
      const f = inGrade.reduce(
        (sum, s) => sum + (Number(s.female_count) || 0),
        0
      );
      return {
        grade: `Grade ${grade}`,
        gradeLevel: grade,
        male: m,
        female: f,
        total: m + f,
      };
    }
    const inGrade = learnerPool.filter((s) => Number(s.grade_level) === grade);
    return {
      grade: `Grade ${grade}`,
      gradeLevel: grade,
      male: inGrade.filter((s) => s.gender === "Male").length,
      female: inGrade.filter((s) => s.gender === "Female").length,
      total: inGrade.length,
    };
  });

  // Keep empty grades as zero when live enrollment exists (no fake fill)
  if (!enrollmentByGrade.some((r) => r.total > 0)) {
    enrollmentByGrade = sampleCharts.enrollmentByGrade;
    usedSample = true;
  }

  // Chart 2: TLE / track distribution
  const trackCounts = {
    ICT: 0,
    "FCS / Cookery": 0,
    AFA: 0,
    Drafting: 0,
  };
  if (useRoster) {
    for (const section of sections) {
      const key = normalizeTrack(section.track_strand);
      if (!key || trackCounts[key] == null) continue;
      trackCounts[key] += sectionHeadcount(section) || 0;
    }
  } else {
    for (const student of learnerPool) {
      const section = sections.find((s) => s.id === student.section_id);
      const key = normalizeTrack(section?.track_strand);
      if (key && trackCounts[key] != null) trackCounts[key] += 1;
    }
  }
  let trackBreakdown = Object.entries(trackCounts).map(([name, value]) => ({
    name,
    value,
  }));
  if (!trackBreakdown.some((t) => t.value > 0)) {
    trackBreakdown = sampleCharts.trackBreakdown;
    usedSample = true;
  }

  // Chart 3: DepEd grade distribution
  const byStudent = new Map();
  for (const row of grades) {
    if (!row.student_id || row.final_transmuted_grade == null) continue;
    if (!byStudent.has(row.student_id)) byStudent.set(row.student_id, []);
    byStudent.get(row.student_id).push(Number(row.final_transmuted_grade));
  }
  const performance = {
    outstanding: 0,
    verySatisfactory: 0,
    satisfactory: 0,
    fairlySatisfactory: 0,
    didNotMeet: 0,
  };
  for (const scores of byStudent.values()) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const band = gradeBand(avg);
    if (band) performance[band] += 1;
  }
  let performanceChart = [
    {
      label: "Outstanding",
      range: "90–100",
      count: performance.outstanding,
      fill: "#0f766e",
    },
    {
      label: "Very Satisfactory",
      range: "85–89",
      count: performance.verySatisfactory,
      fill: "#1d4ed8",
    },
    {
      label: "Satisfactory",
      range: "80–84",
      count: performance.satisfactory,
      fill: "#800000",
    },
    {
      label: "Fairly Satisfactory",
      range: "75–79",
      count: performance.fairlySatisfactory,
      fill: "#b45309",
    },
    {
      label: "Did Not Meet",
      range: "<75",
      count: performance.didNotMeet,
      fill: "#be123c",
    },
  ];
  if (!performanceChart.some((r) => r.count > 0)) {
    performanceChart = sampleCharts.performanceChart;
    usedSample = true;
  }

  // Chart 4: document pipeline
  const aliasMap = {
    SF9: ["SF9", "Form 138"],
    SF10: ["SF10", "Form 137"],
    "Good Moral": ["Good Moral", "Good Moral Certificate"],
  };
  let documentByType = ["SF9", "SF10", "Good Moral"].map((type) => {
    const aliases = aliasMap[type] || [type];
    const rows = docs.filter((d) => aliases.includes(d.document_type));
    return {
      type,
      pending: rows.filter((d) => d.status === "Pending").length,
      processing: rows.filter((d) => d.status === "Processing").length,
      ready: rows.filter((d) => d.status === "Ready for Pickup").length,
      total: rows.length,
    };
  });
  if (!documentByType.some((r) => r.total > 0) || docs.length < 5) {
    documentByType = sampleCharts.documentByType;
    docQueue = {
      pending: documentByType.reduce((s, r) => s + r.pending, 0),
      processing: documentByType.reduce((s, r) => s + r.processing, 0),
      ready: documentByType.reduce((s, r) => s + r.ready, 0),
      total: documentByType.reduce((s, r) => s + r.total, 0),
    };
    usedSample = true;
  }

  // Chart 5: classroom capacity
  const buildingMap = new Map();
  for (const section of sections) {
    const building = buildingFromLocation(section.location);
    if (!buildingMap.has(building)) {
      buildingMap.set(building, {
        building,
        capacity: 0,
        enrolled: 0,
        sections: 0,
      });
    }
    const bucket = buildingMap.get(building);
    bucket.sections += 1;
    bucket.capacity += Number(section.capacity) || 0;
    const enrolledInSection = learnerPool.filter(
      (s) => s.section_id === section.id
    ).length;
    bucket.enrolled +=
      useRoster || enrolledInSection === 0
        ? sectionHeadcount(section)
        : enrolledInSection;
  }

  let capacityByBuilding = Array.from(buildingMap.values())
    .map((row) => ({
      ...row,
      occupancy:
        row.capacity > 0
          ? Math.round((row.enrolled / row.capacity) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.enrolled - a.enrolled);

  let sectionOccupancy = sections
    .map((section) => {
      const enrolledInSection = learnerPool.filter(
        (s) => s.section_id === section.id
      ).length;
      const headcount =
        useRoster || enrolledInSection === 0
          ? sectionHeadcount(section)
          : enrolledInSection;
      const capacity = Number(section.capacity) || 0;
      return {
        id: section.id,
        name: section.section_name,
        gradeLevel: section.grade_level,
        location: section.location || "—",
        building: buildingFromLocation(section.location),
        enrolled: headcount,
        capacity,
        occupancy:
          capacity > 0 ? Math.round((headcount / capacity) * 1000) / 10 : 0,
      };
    })
    .filter((row) => row.capacity > 0 || row.enrolled > 0)
    .sort((a, b) => b.occupancy - a.occupancy)
    .slice(0, 12);

  if (capacityByBuilding.length === 0) {
    capacityByBuilding = sampleCharts.capacityByBuilding;
    sectionOccupancy = sampleCharts.sectionOccupancy;
    usedSample = true;
  }

  let pendingFaculty = pendingTeachersRes.count || 0;
  let pendingActivations = pendingActivationsRes.count || 0;
  let lockedGradebooks = lockedGradesRes.count || 0;
  // class_records.workflow_status may be missing on older DBs
  if (lockedGradesRes.error) lockedGradebooks = 0;

  if (eosyTotal === 0) {
    const sampleKpis = getSampleAnalyticsKpis(year, sections.length);
    eosy = sampleKpis.eosy;
    usedSample = true;
  }

  // Ops queues use live DB only (ensureRegistrarOpsDemoData fills empties)

  // If almost no enrollment signal at all, use full sample KPI package
  let kpis = {
    totalEnrolled,
    male,
    female,
    activeSections: sections.length,
    pendingFaculty,
    pendingActivations,
    lockedGradebooks,
    documentQueue: docQueue,
    snedLearners: snedCount,
    eosy,
  };

  if (totalEnrolled === 0 && sections.length === 0) {
    kpis = {
      ...getSampleAnalyticsKpis(year, 72),
      pendingFaculty,
      pendingActivations,
      lockedGradebooks,
    };
    usedSample = true;
  }

  return {
    schoolYear: year,
    isSample: usedSample,
    kpis,
    charts: {
      enrollmentByGrade,
      trackBreakdown,
      performanceChart,
      documentByType,
      capacityByBuilding,
      sectionOccupancy,
    },
    errors: {
      sections: sectionsRes.error?.message || null,
      students: studentsRes.error?.message || null,
      docs: docsRes.error?.message || null,
      grades: gradesRes.error?.message || null,
    },
  };
}
