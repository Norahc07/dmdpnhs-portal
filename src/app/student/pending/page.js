import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Pending Activation" };

/** Legacy URL — pending learners now use the temporary /student dashboard. */
export default async function StudentPendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login/student");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "student") redirect("/login/student");

  const { data: student } = await supabase
    .from("students")
    .select("activation_status")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (student?.activation_status === "incomplete") {
    redirect("/student/activate");
  }
  redirect("/student?notice=pending");
}
