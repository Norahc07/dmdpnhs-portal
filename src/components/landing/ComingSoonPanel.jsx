import Link from "next/link";
import { Clock3 } from "lucide-react";

export function ComingSoonPanel({
  title = "Available soon",
  description = "This feature is being prepared and will be available in a future update.",
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-[#800000]/12 bg-white px-6 py-12 text-center shadow-[0_16px_50px_-28px_rgba(80,0,0,0.28)] sm:px-10">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-[#800000]/8 text-[#800000]">
        <Clock3 className="size-7" />
      </div>
      <h2 className="mt-5 font-heading text-2xl font-bold text-[#3d1212]">
        {title}
      </h2>
      <p className="mt-3 font-sans text-sm leading-relaxed text-neutral-600 sm:text-base">
        {description}
      </p>
      <p className="mt-2 rounded-full border border-[#ffd700]/50 bg-[#ffd700]/15 px-3 py-1 font-sans text-xs font-semibold tracking-wide text-[#800000] uppercase">
        This feature will be available soon
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-xl bg-[#800000] px-5 py-2.5 font-sans text-sm font-semibold text-white transition hover:bg-[#6a0000]"
      >
        Back to home
      </Link>
    </div>
  );
}
