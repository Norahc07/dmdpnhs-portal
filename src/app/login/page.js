import Link from "next/link";
import { GraduationCap, BookOpen, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata = { title: "Sign in" };

const PATHS = [
  {
    href: "/login/student",
    label: "Student login",
    detail: "LRN and password. Class secretaries sign in here too.",
    icon: GraduationCap,
  },
  {
    href: "/login/teacher",
    label: "Educator login",
    detail: "Email or Teacher ID. Teachers and registrars.",
    icon: BookOpen,
  },
  {
    href: "/login/student",
    label: "Class secretary",
    detail: "No separate account. Use student login; access appears after your adviser appoints you.",
    icon: ShieldCheck,
  },
];

export default function LoginIndexPage() {
  return (
    <AuthShell wide>
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-[#800000]/12 bg-white/95 shadow-[0_20px_60px_-28px_rgba(80,0,0,0.35)]">
        <div className="h-1.5 w-full bg-[#800000]" />
        <div className="px-6 py-7 sm:px-8">
          <p className="text-center text-xs font-semibold tracking-[0.25em] text-[#800000] uppercase">
            PastraPortal
          </p>
          <h1 className="mt-2 text-center font-heading text-2xl font-bold text-[#3d1212]">
            Login & account
          </h1>
          <p className="mx-auto mt-1 max-w-md text-center text-sm text-neutral-600">
            Choose how you sign in. Role-based access opens only the portal for
            your account.
          </p>
          <div className="mt-6 grid gap-3">
            {PATHS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-start gap-3 rounded-2xl border border-[#800000]/10 bg-[#faf7f5] px-4 py-4 transition hover:border-[#800000]/25 hover:bg-white"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-heading font-bold text-[#3d1212]">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {item.detail}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
          <p className="mt-5 text-center text-xs text-neutral-600">
            New student?{" "}
            <Link href="/register/student" className="font-semibold text-[#800000] underline">
              Set up a password
            </Link>
            {" · "}
            Forgot password?{" "}
            <Link href="/login/student/reset" className="font-semibold text-[#800000] underline">
              Student reset
            </Link>
            {" / "}
            <Link href="/login/teacher/reset" className="font-semibold text-[#800000] underline">
              Educator reset
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
