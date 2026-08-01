export async function getTeacherAccess(supabase, profileId) {
  const { data } = await supabase
    .from("teachers")
    .select("id, faculty_position, department_id")
    .eq("profile_id", profileId)
    .maybeSingle();

  return {
    teacherId: data?.id || null,
    facultyPosition: data?.faculty_position || "teacher",
    departmentId: data?.department_id || null,
    canValidateGrades:
      data?.faculty_position === "department_head" &&
      Boolean(data?.department_id),
  };
}
