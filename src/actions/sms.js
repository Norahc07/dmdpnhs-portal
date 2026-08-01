"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendSMS } from "@/lib/semaphore";
import { SCHOOL_SHORT } from "@/lib/constants";

async function getParentPhonesForStudent(studentId) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("parent_student_links")
    .select("parents(phone_number, access_code)")
    .eq("student_id", studentId);

  return (data || [])
    .map((row) => row.parents?.phone_number)
    .filter(Boolean);
}

export async function sendAbsenceAlert({ studentId, date }) {
  const admin = createAdminClient();
  const { data: student } = await admin
    .from("students")
    .select("id, profiles(first_name, last_name)")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) return { error: "Student not found" };

  const name = `${student.profiles?.first_name || ""} ${student.profiles?.last_name || ""}`.trim();
  const formattedDate = new Date(date).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const message = `Good day. ${name} was marked absent today, ${formattedDate}. - ${SCHOOL_SHORT}`;
  const phones = await getParentPhonesForStudent(studentId);

  if (!phones.length) {
    return { ok: false, error: "No parent phone numbers linked" };
  }

  const results = [];
  for (const phone of phones) {
    results.push(await sendSMS({ recipient: phone, message, triggerType: "absence" }));
  }

  return { ok: results.some((r) => r.ok), results };
}

export async function broadcastQuarterlyGrades({
  sectionId,
  subjectId,
  quarter,
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const admin = createAdminClient();

  const { data: students } = await admin
    .from("students")
    .select("id, profiles(first_name, last_name)")
    .eq("section_id", sectionId);

  const { data: subject } = await admin
    .from("subjects")
    .select("subject_name")
    .eq("id", subjectId)
    .maybeSingle();

  const { data: grades } = await admin
    .from("grades")
    .select("student_id, final_transmuted_grade")
    .eq("subject_id", subjectId)
    .eq("quarter", Number(quarter));

  const gradeMap = Object.fromEntries(
    (grades || []).map((g) => [g.student_id, g.final_transmuted_grade])
  );

  let sent = 0;
  for (const student of students || []) {
    const tg = gradeMap[student.id];
    if (tg == null) continue;

    const name = `${student.profiles?.first_name || ""} ${student.profiles?.last_name || ""}`.trim();
    const message = `Good day. ${name}'s Q${quarter} grade in ${subject?.subject_name || "subject"} is ${tg}. - ${SCHOOL_SHORT}`;
    const phones = await getParentPhonesForStudent(student.id);

    for (const phone of phones) {
      const result = await sendSMS({
        recipient: phone,
        message,
        triggerType: "grades",
      });
      if (result.ok) sent += 1;
    }
  }

  return { ok: true, sent };
}
