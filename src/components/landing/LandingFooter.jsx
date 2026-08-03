import { SCHOOL_NAME } from "@/lib/constants";

export function LandingFooter() {
  return (
    <footer className="border-t border-[#800000]/10 bg-linear-to-b from-[#faf7f5] to-[#f3ebe8] px-4 py-8 text-center sm:px-6">
      <div className="mx-auto mb-3 h-[3px] w-16 rounded-full bg-linear-to-r from-[#800000] to-[#b33a3a]" />
      <p className="font-sans text-xs text-[#3d1212]/75 sm:text-sm">
        © 2026 {SCHOOL_NAME}. All rights reserved.
      </p>
    </footer>
  );
}
