"use client";

import { APP_NAME, SCHOOL_NAME } from "@/lib/constants";

const GOLD = "#ffd700";

function scrollToPortals(e) {
  e?.preventDefault?.();
  const target = document.getElementById("portals");
  if (!target) return;

  const headerOffset = 72;
  const top =
    target.getBoundingClientRect().top + window.scrollY - headerOffset;

  window.scrollTo({ top, behavior: "smooth" });
}

function WhiteArrow({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M12 16.85c-.35 0-.68-.13-.94-.39l-5.2-5.2a1.33 1.33 0 0 1 1.88-1.88L12 13.64l4.26-4.26a1.33 1.33 0 1 1 1.88 1.88l-5.2 5.2c-.26.26-.59.39-.94.39Z" />
    </svg>
  );
}

export function LandingHero() {
  return (
    <section className="relative isolate flex min-h-svh flex-col overflow-hidden pt-16 sm:min-h-[min(92vh,860px)] sm:pt-18">
      {/* CSS background = faster first paint than next/image + blur */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/hero-opt.jpg')" }}
        aria-hidden
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(74,0,0,0.72) 0%, rgba(128,0,0,0.78) 45%, rgba(74,0,0,0.92) 100%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-12 text-center sm:px-6 sm:py-16">
        <span
          className="hero-enter hero-enter-delay-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-sans text-[11px] font-semibold tracking-[0.22em] text-white uppercase sm:text-xs"
          style={{ borderColor: "rgba(255,215,0,0.45)", background: "rgba(255,215,0,0.12)" }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: GOLD }}
          />
          Official school portal
        </span>

        <p className="hero-enter hero-enter-delay-2 mt-6 font-sans text-sm font-medium text-white/90 sm:text-base">
          Welcome to
        </p>

        <h1 className="hero-enter hero-enter-delay-3 mt-2 font-heading text-[2.5rem] leading-[1.05] font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
          <span style={{ color: GOLD }}>{APP_NAME}</span>
        </h1>

        <div
          className="hero-enter hero-enter-delay-3 mx-auto mt-5 h-1 w-14 rounded-full sm:w-16"
          style={{ backgroundColor: GOLD }}
        />

        <p className="hero-enter hero-enter-delay-4 mx-auto mt-5 max-w-xl font-sans text-sm leading-relaxed text-white/90 sm:text-base">
          Access grades, attendance, and school services in one secure place for{" "}
          <span className="font-semibold text-white">{SCHOOL_NAME}</span>.
        </p>
      </div>

      <div className="hero-enter hero-enter-delay-5 relative z-10 flex justify-center px-4 pt-1 pb-8 sm:pb-10">
        <button
          type="button"
          onClick={scrollToPortals}
          className="group flex flex-col items-center gap-3 outline-none"
          aria-label="Choose your portal — scroll down"
        >
          <span
            className="inline-flex items-center rounded-full px-5 py-2.5 font-sans text-xs font-bold tracking-[0.16em] text-[#4a0000] uppercase transition duration-200 group-hover:brightness-110 group-active:scale-[0.98]"
            style={{ backgroundColor: GOLD }}
          >
            Choose your portal
          </span>

          <span
            className="flex h-14 flex-col items-center"
            style={{ color: GOLD }}
            aria-hidden
          >
            <WhiteArrow className="size-8 animate-point-down" />
            <WhiteArrow className="-mt-4 size-8 animate-point-down-delayed opacity-45" />
          </span>
        </button>
      </div>
    </section>
  );
}
