import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, SCHOOL_NAME, SCHOOL_SHORT } from "@/lib/constants";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { PortalCards } from "@/components/landing/PortalCards";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata = {
  title: `${SCHOOL_SHORT} Portal | ${SCHOOL_NAME}`,
  description:
    "Official school portal for students, parents, and teachers of Dr. Maria D. Pastrana National High School.",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dashboardHref = "/#portals";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      dashboardHref =
        profile.role === "teacher" && profile.status === "pending"
          ? "/teacher/pending"
          : ROLE_HOME[profile.role] || "/#portals";

      if (profile.role === "student") {
        const { data: student } = await supabase
          .from("students")
          .select("activation_status")
          .eq("profile_id", user.id)
          .maybeSingle();
        if (student?.activation_status === "incomplete") {
          dashboardHref = "/student/activate";
        } else if (student?.activation_status === "pending") {
          dashboardHref = "/student";
        }
      }
    }
  }

  return (
    <div className="relative min-h-screen">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/login-bg-opt.jpg')" }}
        aria-hidden
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(74,0,0,0.55) 0%, rgba(128,0,0,0.65) 50%, rgba(74,0,0,0.88) 100%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <LandingHeader
          authHref={user ? dashboardHref : "/#portals"}
          authLabel={user ? "Dashboard" : "Login"}
        />
        <main className="-mt-16 flex-1 sm:-mt-18">
          <LandingHero />
          <PortalCards />
        </main>
        <LandingFooter />
      </div>
    </div>
  );
}
