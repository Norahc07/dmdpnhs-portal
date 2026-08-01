import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Link2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PublicShell } from "@/components/landing/PublicShell";
import { SCHOOL_NAME, SCHOOL_SHORT } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "About",
  description: `About ${SCHOOL_SHORT} Portal — why it was built, what it covers, and how students, parents, teachers, and the registrar use the system.`,
};

const WHY_BUILT = [
  {
    title: "Clearer access to school records",
    body: "Grades, attendance, and enrollment status should be easy to check without waiting in long lines or chasing paper forms.",
  },
  {
    title: "Stronger home–school connection",
    body: "Parents stay informed through the portal and SMS alerts when a learner is absent or when quarterly grades are shared.",
  },
  {
    title: "DepEd-aligned classroom tools",
    body: "Teachers record grades and attendance in one place; the registrar manages faculty approval, learner progression, documents, and school forms.",
  },
  {
    title: "One secure digital campus",
    body: `${SCHOOL_SHORT} Portal was built so every role—student, parent, teacher, and registrar—works from a shared, role-protected system.`,
  },
];

const SCOPE = [
  "Student grades, attendance, calendar, and document requests",
  "Parent monitoring of linked children’s progress",
  "Teacher gradebook and class attendance with SMS alerts",
  "Registrar faculty approval, student status, documents, and SF exports",
];

const GUIDES = [
  {
    role: "Student",
    icon: GraduationCap,
    start: "Landing → Register Account → Phase 1 (LRN + birthdate) → Phase 2 (profile)",
    login: "/login/student",
    register: "/register/student",
    steps: [
      "Your student record is prepared by the school (LRN and birthdate).",
      "Phase 1: Register with LRN + birthdate + password at /register/student.",
      "Phase 2: Complete personal details (name, grade, section, address, contacts) and parent/guardian emergency info.",
      "Wait on the temporary dashboard while the registrar verifies your record and calls the parent number.",
      "After approval, you get an SMS; parents get their Access Code by SMS from DMDPNHS.",
      "Check My Grades and Attendance once you are activated and enrolled in a section/subjects.",
      "Open Documents to request Form 137, Certificate of Enrollment, Good Moral, or Other.",
    ],
  },
  {
    role: "Parent",
    icon: Users,
    start: "Landing → Choose Parent portal → Login with Parent Access Code",
    login: "/login/parent",
    steps: [
      "After your child’s Phase 2 details are verified by the registrar, you receive an SMS with your Parent Access Code and portal link.",
      "Sign in on the Parent portal using that code.",
      "Open the dashboard to see linked learners.",
      "Review Grades and Attendance for each linked student.",
      "Receive SMS when a teacher marks an absence, and optional SMS when grades are broadcast.",
    ],
  },
  {
    role: "Teacher / Educator",
    icon: BookOpen,
    start: "Register as faculty, or login with email / Teacher ID",
    login: "/login/teacher",
    register: "/register/teacher",
    steps: [
      "New faculty: register on the teacher registration page to receive a Teacher ID. Your account stays pending until approved.",
      "Wait on the pending page until the registrar approves your account.",
      "After approval, sign in and open the Teacher dashboard (maroon welcome overview).",
      "Use Gradebook to encode DepEd-weighted grades and optionally broadcast term grades via SMS to parents.",
      "Use Attendance to mark present, absent, or late. Absences can trigger SMS to linked parents.",
    ],
  },
  {
    role: "Registrar",
    icon: ClipboardList,
    start: "School-issued registrar account → Login as staff → Registrar home",
    login: "/login/teacher",
    note: "Registrar accounts are created by the school (not public self-registration). Use the staff login, then open the Registrar portal.",
    steps: [
      "Sign in with your registrar credentials and go to the Registrar dashboard.",
      "On Activations: review student Phase 2 details, call the parent number to confirm it works, then Verify & Approve.",
      "Approve or reject pending faculty on Faculty.",
      "Manage learner status on Students (promote, transfer, retain, remedial).",
      "Process document requests: Pending → Processing → Ready for Pickup.",
      "Export school forms (SF1 / SF2 / SF5) from School Forms.",
    ],
  },
];

const CONNECTIONS = [
  {
    from: "Registrar",
    to: "Teacher",
    text: "Approves (or rejects) new faculty so teachers can use the gradebook and attendance tools.",
  },
  {
    from: "Registrar",
    to: "Student / Parent",
    text: "Prepares learner and parent records, access codes, and links; manages promotion, transfer, and enrollment status.",
  },
  {
    from: "Teacher",
    to: "Student & Parent",
    text: "Saves grades and attendance that appear on student and parent portals.",
  },
  {
    from: "Teacher",
    to: "Parent (SMS)",
    text: "Absence alerts and optional quarterly grade broadcasts go to linked parent phone numbers.",
  },
  {
    from: "Student",
    to: "Registrar",
    text: "Submits document requests; the registrar advances status until Ready for Pickup.",
  },
  {
    from: "Student",
    to: "Registrar dashboard",
    text: "Self-enrolls for the semester when allowed; enrollment counts feed registrar overview.",
  },
];

function Panel({ children, className = "" }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-[#800000]/10 bg-white p-6 shadow-[0_16px_50px_-28px_rgba(80,0,0,0.22)] sm:p-8",
        className
      )}
    >
      {children}
    </div>
  );
}

export default function AboutPage() {
  return (
    <PublicShell>
      <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-14 sm:space-y-16">
          <header className="text-center">
            <p className="font-sans text-xs font-semibold tracking-[0.22em] text-[#800000] uppercase">
              About the portal
            </p>
            <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-[#3d1212] sm:text-4xl">
              {SCHOOL_SHORT} Portal
            </h1>
            <p className="mt-2 font-sans text-sm text-neutral-600 sm:text-base">
              Official digital campus of {SCHOOL_NAME}
            </p>
            <Panel className="mt-8 space-y-4 text-left">
              <p className="font-sans text-sm leading-relaxed text-neutral-700 sm:text-base">
                The {SCHOOL_SHORT} Portal is the school’s secure online system
                for learners, parents, educators, and the registrar. It brings
                grades, attendance, documents, enrollment status, and school
                forms into one place—built for everyday use on desktop and
                mobile, and aligned with DepEd classroom practice.
              </p>
              <p className="font-sans text-sm leading-relaxed text-neutral-700 sm:text-base">
                Start from the{" "}
                <Link
                  href="/#portals"
                  className="font-semibold text-[#800000] underline-offset-2 hover:underline"
                >
                  Choose your portal
                </Link>{" "}
                section on the home page, or open About, Admission, and Contact
                from the main menu.
              </p>
            </Panel>
          </header>

          <section aria-labelledby="why-built">
            <div className="mb-6 flex flex-col items-center text-center">
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
                <ShieldCheck className="size-5" />
              </span>
              <h2
                id="why-built"
                className="mt-3 font-heading text-2xl font-bold text-[#3d1212] sm:text-3xl"
              >
                Why this system was built
              </h2>
              <p className="mt-1 font-sans text-sm text-neutral-600">
                The purpose behind {SCHOOL_SHORT} Portal
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {WHY_BUILT.map((item) => (
                <Panel key={item.title} className="p-5 sm:p-6">
                  <h3 className="font-heading text-lg font-bold text-[#3d1212]">
                    {item.title}
                  </h3>
                  <p className="mt-2 font-sans text-sm leading-relaxed text-neutral-600">
                    {item.body}
                  </p>
                </Panel>
              ))}
            </div>
          </section>

          <section aria-labelledby="scope" className="text-center">
            <h2
              id="scope"
              className="font-heading text-2xl font-bold text-[#3d1212] sm:text-3xl"
            >
              What the system covers
            </h2>
            <p className="mt-2 font-sans text-sm text-neutral-600 sm:text-base">
              Core services available inside the portals today.
            </p>
            <ul className="mt-6 grid gap-3 text-left sm:grid-cols-2">
              {SCOPE.map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-[#800000]/10 bg-[#800000]/5 px-4 py-3 font-sans text-sm text-[#3d1212]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="user-guide-heading" id="user-guide">
            <div className="mb-6 text-center">
              <p className="font-sans text-xs font-semibold tracking-[0.22em] text-[#800000] uppercase">
                User Guide
              </p>
              <h2
                id="user-guide-heading"
                className="mt-2 font-heading text-2xl font-bold text-[#3d1212] sm:text-3xl"
              >
                How to use each portal
              </h2>
              <p className="mx-auto mt-2 max-w-2xl font-sans text-sm leading-relaxed text-neutral-600 sm:text-base">
                Follow your role below—from how you start, to the everyday
                workflow inside the system.
              </p>
            </div>

            <div className="space-y-6">
              {GUIDES.map((guide) => {
                const Icon = guide.icon;
                return (
                  <Panel key={guide.role}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
                          <Icon className="size-5" />
                        </span>
                        <div>
                          <h3 className="font-heading text-xl font-bold text-[#3d1212]">
                            {guide.role}
                          </h3>
                          <p className="mt-1 font-sans text-sm text-neutral-600">
                            <span className="font-semibold text-[#800000]">
                              Start:
                            </span>{" "}
                            {guide.start}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {guide.register ? (
                          <Link
                            href={guide.register}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#800000]/20 bg-white px-3 py-2 font-sans text-xs font-semibold text-[#800000] transition hover:bg-[#800000]/5"
                          >
                            Register
                          </Link>
                        ) : null}
                        <Link
                          href={guide.login}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#800000] px-3 py-2 font-sans text-xs font-bold text-white transition hover:bg-[#6a0000]"
                        >
                          Open login
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </div>
                    </div>
                    {guide.note ? (
                      <p className="mt-4 rounded-xl border border-[#ffd700]/40 bg-[#ffd700]/15 px-4 py-3 font-sans text-sm text-[#3d1212]">
                        {guide.note}
                      </p>
                    ) : null}
                    <ol className="mt-5 space-y-2.5">
                      {guide.steps.map((step, index) => (
                        <li
                          key={step}
                          className="flex gap-3 font-sans text-sm leading-relaxed text-neutral-700"
                        >
                          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#800000]/8 font-semibold text-[#800000]">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </Panel>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="connections">
            <div className="mb-6 flex flex-col items-center text-center">
              <span className="flex size-10 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
                <Link2 className="size-5" />
              </span>
              <h2
                id="connections"
                className="mt-3 font-heading text-2xl font-bold text-[#3d1212] sm:text-3xl"
              >
                How roles connect
              </h2>
              <p className="mt-1 font-sans text-sm text-neutral-600">
                Workflows that pass information between portals
              </p>
            </div>
            <Panel>
              <ul className="space-y-5">
                {CONNECTIONS.map((item) => (
                  <li
                    key={`${item.from}-${item.to}`}
                    className="border-b border-[#800000]/10 pb-5 last:border-0 last:pb-0"
                  >
                    <p className="font-sans text-sm font-semibold text-[#800000]">
                      {item.from}{" "}
                      <span className="font-normal text-neutral-400">→</span>{" "}
                      {item.to}
                    </p>
                    <p className="mt-1.5 font-sans text-sm leading-relaxed text-neutral-600">
                      {item.text}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          </section>

          <section>
            <Panel className="text-center">
              <h2 className="font-heading text-xl font-bold text-[#3d1212] sm:text-2xl">
                Ready to enter your portal?
              </h2>
              <p className="mx-auto mt-2 max-w-lg font-sans text-sm text-neutral-600">
                Pick your role on the home page and sign in with the credentials
                issued by {SCHOOL_SHORT}.
              </p>
              <Link
                href="/#portals"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#800000] px-5 py-3 font-sans text-sm font-bold text-white transition hover:bg-[#6a0000]"
              >
                Choose your portal
                <ArrowRight className="size-4" />
              </Link>
            </Panel>
          </section>
        </div>
      </div>
    </PublicShell>
  );
}
