import { redirect } from "next/navigation";
import { logout } from "@/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { StudentActivationForm } from "@/components/student/StudentActivationForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parentAccessCodeFormatExample } from "@/lib/constants";

export const metadata = { title: "Complete Profile" };

export default async function StudentActivatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login/student");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "student") redirect("/login/student");

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!student) redirect("/login/student");
  if (student.activation_status === "pending") redirect("/student?notice=pending");
  if (student.activation_status === "active") redirect("/student");

  const { data: sections } = await supabase
    .from("sections")
    .select("id, section_name, grade_level, school_year")
    .order("grade_level")
    .order("section_name");

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Card className="border-[#800000]/10 shadow-lg">
          <CardHeader>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#800000] uppercase">
              Phase 2 · First login profile
            </p>
            <CardTitle className="text-2xl text-[#3d1212]">
              Complete your personal details
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              LRN {student.lrn}. After you submit, the registrar will verify your
              record and call your parent number. When approved, parents receive
              an Access Code like {parentAccessCodeFormatExample()} via SMS from
              DMDPNHS.
            </p>
          </CardHeader>
          <CardContent>
            <StudentActivationForm
              profile={profile}
              sections={sections || []}
              initial={{
                firstName:
                  profile.first_name !== "Student" ? profile.first_name : "",
                middleName: profile.middle_name || "",
                lastName:
                  profile.last_name !== student.lrn ? profile.last_name : "",
                gradeLevel: student.grade_level || "",
                sectionId: student.section_id || "",
                contactNumber: student.contact_number || "",
                personalEmail: student.personal_email || "",
                address: student.address || "",
              }}
            />
            <form action={logout} className="mt-6">
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
