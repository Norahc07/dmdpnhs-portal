import { PublicShell } from "@/components/landing/PublicShell";
import { SCHOOL_NAME } from "@/lib/constants";
import { Mail, MapPin, Phone } from "lucide-react";

export const metadata = { title: "Contact" };

const CONTACTS = [
  {
    icon: MapPin,
    title: "Campus",
    text: SCHOOL_NAME,
  },
  {
    icon: Phone,
    title: "Registrar",
    text: "Visit the registrar office during school hours",
  },
  {
    icon: Mail,
    title: "Portal support",
    text: "registrar@dmdpnhs.edu.ph",
  },
];

export default function ContactPage() {
  return (
    <PublicShell>
      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="font-sans text-xs font-semibold tracking-[0.22em] text-[#800000] uppercase">
              Contact
            </p>
            <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-[#3d1212] sm:text-4xl">
              Get in touch
            </h1>
            <p className="mx-auto mt-3 max-w-xl font-sans text-sm text-neutral-600 sm:text-base">
              Reach the school office for enrollment, records, and portal
              assistance.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {CONTACTS.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-[#800000]/10 bg-white p-6 text-center shadow-[0_16px_50px_-28px_rgba(80,0,0,0.22)]"
              >
                <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-[#800000]/8 text-[#800000]">
                  <Icon className="size-5" />
                </div>
                <p className="font-heading text-sm font-bold text-[#3d1212]">
                  {title}
                </p>
                <p className="mt-2 font-sans text-sm text-neutral-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
