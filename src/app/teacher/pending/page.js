import { redirect } from "next/navigation";
import { logout } from "@/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
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
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(165deg,#faf7f5_0%,#ffffff_45%,#f3ebe8_100%)] px-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_16px_40px_-24px_rgba(61,18,18,0.4)]">
        <div className="h-1 w-full bg-linear-to-r from-[#800000] via-[#b33a3a] to-transparent" />
        <div className="space-y-4 p-6 sm:p-7">
          <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200/80">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="portal-page-kicker">Faculty registration</p>
            <h1 className="mt-1 font-heading text-xl font-bold text-[#3d1212]">
              Account pending approval
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Hi {profile.first_name}, your faculty registration was received.
              Please wait for the registrar to approve your account.
            </p>
          </div>

          <div className="rounded-2xl border border-[#ffd700]/40 bg-linear-to-br from-[#ffd700]/15 to-[#faf7f5] p-4 text-center">
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

          <div className="space-y-1 rounded-xl border border-[#800000]/08 bg-[#faf7f5] px-3 py-2.5 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-[#3d1212]">Format:</span> T =
              Teacher · year code · random unique number
            </p>
            <p>Department: {teacher?.faculty_dept || "—"}</p>
          </div>

          <form action={logout}>
            <Button
              type="submit"
              variant="outline"
              className="mt-1 w-full border-[#800000]/15 text-[#3d1212] hover:bg-[#800000]/5"
            >
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
