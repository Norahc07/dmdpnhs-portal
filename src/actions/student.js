"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function enrollCurrentSemester() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: student, error: findError } = await supabase
    .from("students")
    .select("id, status")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (findError || !student) {
    return { error: "Student record not found." };
  }

  if (student.status === "enrolled") {
    return { ok: true, already: true };
  }

  // Service role update after ownership check (RLS often blocks student self-update)
  const admin = createAdminClient();
  const { error } = await admin
    .from("students")
    .update({ status: "enrolled" })
    .eq("id", student.id)
    .eq("profile_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/student");
  return { ok: true };
}
