"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ClipboardList } from "lucide-react";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { cn } from "@/lib/utils";

const PORTALS = [
  {
    role: "Student",
    eyebrow: "Learner access",
    description:
      "View grades, attendance, and request official documents in one secure place built for every school day.",
    features: ["Grades & transcripts", "Attendance record", "Document requests"],
    href: "/login/student",
    cta: "Enter student portal",
    quote: "Every grade and attendance mark is a step toward your goals—stay curious, stay present.",
    image:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
    alt: "Students learning together",
    imageLeft: true,
  },
  {
    role: "Parent",
    eyebrow: "Family hub",
    description:
      "Follow your child’s progress with live grades and attendance updates so you always know how they’re doing.",
    features: ["Daily attendance", "Real-time grades", "Progress overview"],
    href: "/login/parent",
    cta: "Enter parent portal",
    quote: "When you follow their progress with care, you walk beside them every school day.",
    image:
      "https://images.unsplash.com/photo-1476703993599-0035a21b17a9?auto=format&fit=crop&w=1200&q=80",
    alt: "Parent supporting a learner",
    imageLeft: false,
  },
  {
    role: "Educator",
    eyebrow: "Faculty console",
    description:
      "Record scores, mark attendance, and manage classes from anywhere with tools designed for teachers.",
    features: ["Interactive gradebook", "Smart attendance", "Class management"],
    href: "/login/teacher",
    cta: "Enter educator portal",
    quote: "A clear gradebook and mindful attendance turn teaching into lasting guidance.",
    image: "/images/portal-educator.jpg",
    alt: "Teacher helping a student with schoolwork",
    imageLeft: true,
  },
];

function PortalMedia({ portal, index }) {
  return (
    <div className="relative min-h-64 overflow-hidden sm:min-h-72 lg:min-h-80">
      <Image
        src={portal.image}
        alt={portal.alt}
        fill
        className="object-cover transition duration-700 ease-out group-hover:scale-105"
        sizes="(max-width: 1024px) 100vw, 50vw"
        priority={index === 0}
      />

      {/* Maroon vertical fade + open text — visible on hover only */}
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#800000]/85 via-[#800000]/45 to-[#800000]/0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 flex translate-y-3 flex-col items-center px-6 pb-8 text-center opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100 sm:px-8">
        <p className="max-w-md font-heading text-base leading-snug font-semibold text-balance text-white drop-shadow-sm sm:text-lg">
          “{portal.quote}”
        </p>
      </div>
    </div>
  );
}

function PortalDetails({ portal }) {
  return (
    <div className="flex flex-col justify-center bg-white px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
      <p className="font-sans text-xs font-semibold tracking-[0.2em] text-[#800000] uppercase">
        {portal.eyebrow}
      </p>
      <h3 className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#3d1212] sm:text-3xl">
        {portal.role} portal
      </h3>
      <p className="mt-3 max-w-md font-sans text-sm leading-relaxed text-neutral-600 sm:text-[15px]">
        {portal.description}
      </p>

      <ul className="mt-6 space-y-3">
        {portal.features.map((feature) => (
          <li
            key={feature}
            className="flex items-center gap-3 font-sans text-sm text-[#3d1212]"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <Check className="size-3.5 stroke-[2.5]" />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Link
          href={portal.href}
          className="group/btn inline-flex items-center justify-center gap-2 rounded-xl bg-[#800000] px-5 py-3 font-sans text-sm font-bold text-white shadow-md transition duration-200 hover:bg-[#6a0000] hover:shadow-lg active:scale-[0.98]"
        >
          {portal.cta}
          <ArrowRight className="size-4 transition duration-200 group-hover/btn:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

export function PortalCards() {
  return (
    <section
      id="portals"
      className="relative scroll-mt-18 overflow-hidden bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="relative mx-auto max-w-6xl">
        <ScrollReveal className="mx-auto mb-12 max-w-2xl text-center sm:mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#ffd700]/50 bg-[#ffd700]/15 px-3 py-1 font-sans text-[11px] font-semibold tracking-[0.2em] text-[#800000] uppercase shadow-sm">
            <ClipboardList className="size-3.5 text-[#800000]" />
            Get started
          </span>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-[#3d1212] sm:text-4xl">
            Choose your <span className="text-[#800000]">portal</span>
          </h2>
          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-[#ffd700]" />
          <p className="mt-3 font-sans text-sm leading-relaxed text-neutral-600 sm:text-base">
            Three clear pathways—pick the one that matches your role. Image on
            one side, details and access on the other.
          </p>
        </ScrollReveal>

        <div className="flex flex-col gap-8 lg:gap-10">
          {PORTALS.map((portal, index) => (
            <ScrollReveal
              key={portal.role}
              as="article"
              variant={portal.imageLeft ? "left" : "right"}
              delay={index * 100}
              className="group overflow-hidden rounded-3xl border border-[#800000]/10 bg-white shadow-[0_16px_50px_-28px_rgba(80,0,0,0.28)]"
            >
              <div
                className={cn(
                  "grid lg:min-h-80 lg:grid-cols-2",
                  !portal.imageLeft && "lg:[&>*:first-child]:order-2"
                )}
              >
                <PortalMedia portal={portal} index={index} />
                <PortalDetails portal={portal} />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
