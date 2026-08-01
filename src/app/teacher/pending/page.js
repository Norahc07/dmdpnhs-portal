import { redirect } from "next/navigation";
import { logout } from "@/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheck, Clock } from "lucide-react";

export const metadata = { title: "Pending Approval" };

export default async function TeacherPendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login/teacher");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "teacher") redirect("/login/teacher");
  if (profile.status === "active") redirect("/teacher");

  const { data: teacher } = await supabase
    .from("teachers")
    .select("teacher_id, faculty_dept")
    .eq("profile_id", user.id)
    .maybeSingle();

  const teacherId = teacher?.teacher_id || "—";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(160deg,#2a0a0a,#800000,#4a0000)] px-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Clock className="size-5" />
          </div>
          <CardTitle>Account pending approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Hi {profile.first_name}, your faculty registration was received.
            Please wait for the registrar to approve your account.
          </p>

          <div className="rounded-xl border border-[#ffd700]/50 bg-[#ffd700]/15 p-4 text-center">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#800000] uppercase">
              <BadgeCheck className="size-3.5" />
              Your Teacher ID
            </p>
            <p className="mt-2 font-(family-name:--font-montserrat) text-2xl font-extrabold tracking-wide text-[#3d1212]">
              {teacherId}
            </p>
            <p className="mt-2 text-xs text-[#3d1212]/80">
              Write this down or take a screenshot. This is your unique faculty
              ID for DMDPNHS.
            </p>
          </div>

          <div className="space-y-1 text-xs">
            <p>
              <span className="font-medium text-foreground">Format:</span> T =
              Teacher · year code · random unique number
            </p>
            <p>Department: {teacher?.faculty_dept || "—"}</p>
          </div>

          <form action={logout}>
            <Button type="submit" variant="outline" className="mt-1 w-full">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
