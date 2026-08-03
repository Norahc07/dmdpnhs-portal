/**
 * Illustrative sample series for registrar analytics charts when live
 * grades / document / EOSY data is still thin.
 */
export function getSampleAnalyticsCharts() {
  return {
    enrollmentByGrade: [
      { grade: "Grade 7", gradeLevel: 7, male: 354, female: 307, total: 661 },
      { grade: "Grade 8", gradeLevel: 8, male: 328, female: 341, total: 669 },
      { grade: "Grade 9", gradeLevel: 9, male: 312, female: 298, total: 610 },
      { grade: "Grade 10", gradeLevel: 10, male: 289, female: 276, total: 565 },
      { grade: "Grade 11", gradeLevel: 11, male: 248, female: 265, total: 513 },
      { grade: "Grade 12", gradeLevel: 12, male: 231, female: 252, total: 483 },
    ],
    trackBreakdown: [
      { name: "ICT", value: 620 },
      { name: "FCS / Cookery", value: 480 },
      { name: "AFA", value: 310 },
      { name: "Drafting", value: 240 },
    ],
    performanceChart: [
      { label: "Outstanding", range: "90–100", count: 186, fill: "#0f766e" },
      { label: "Very Satisfactory", range: "85–89", count: 412, fill: "#1d4ed8" },
      { label: "Satisfactory", range: "80–84", count: 538, fill: "#800000" },
      { label: "Fairly Satisfactory", range: "75–79", count: 294, fill: "#b45309" },
      { label: "Did Not Meet", range: "<75", count: 75, fill: "#be123c" },
    ],
    documentByType: [
      { type: "SF9", pending: 12, processing: 5, ready: 18, total: 35 },
      { type: "SF10", pending: 8, processing: 3, ready: 11, total: 22 },
      { type: "Good Moral", pending: 15, processing: 4, ready: 21, total: 40 },
    ],
    capacityByBuilding: [
      { building: "Megawide Bldg.", capacity: 540, enrolled: 486, sections: 12, occupancy: 90 },
      { building: "FQL Bldg.", capacity: 500, enrolled: 448, sections: 10, occupancy: 89.6 },
      { building: "DepEd Bldg.", capacity: 450, enrolled: 392, sections: 10, occupancy: 87.1 },
      { building: "Chinese Chamber Bldg.", capacity: 320, enrolled: 278, sections: 8, occupancy: 86.9 },
      { building: "RPN Bldg.", capacity: 235, enrolled: 198, sections: 5, occupancy: 84.3 },
    ],
    sectionOccupancy: [
      { id: "s1", name: "AMETHYST", gradeLevel: 7, location: "Megawide Bldg. 4", building: "Megawide Bldg.", enrolled: 44, capacity: 45, occupancy: 97.8 },
      { id: "s2", name: "ACETATE", gradeLevel: 9, location: "RPN Bldg. 3", building: "RPN Bldg.", enrolled: 45, capacity: 47, occupancy: 95.7 },
      { id: "s3", name: "EINSTEIN", gradeLevel: 10, location: "FQL Bldg. 8", building: "FQL Bldg.", enrolled: 45, capacity: 50, occupancy: 90 },
      { id: "s4", name: "NUCLEOLUS", gradeLevel: 8, location: "FQL Bldg. 8", building: "FQL Bldg.", enrolled: 40, capacity: 50, occupancy: 80 },
      { id: "s5", name: "LWD - Hope", gradeLevel: 7, location: "SNED DepEd 1", building: "SNED DepEd 1", enrolled: 18, capacity: 40, occupancy: 45 },
      { id: "s6", name: "CURIE", gradeLevel: 10, location: "Chinese Chamber", building: "Chinese Chamber Bldg.", enrolled: 40, capacity: 40, occupancy: 100 },
    ],
  };
}

export function getSampleAnalyticsKpis(schoolYear, activeSections = 72) {
  return {
    totalEnrolled: 2505,
    male: 1283,
    female: 1222,
    activeSections,
    pendingFaculty: 3,
    pendingActivations: 5,
    lockedGradebooks: 4,
    documentQueue: { pending: 35, processing: 12, ready: 50, total: 97 },
    snedLearners: 60,
    eosy: { promoted: 2140, retained: 48, remedial: 72 },
    schoolYear,
  };
}
