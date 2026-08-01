import { SCHOOL_NAME } from "@/lib/constants";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#800000] px-4 py-7 text-center sm:px-6">
      <p className="font-sans text-xs text-white/85 sm:text-sm">
        © 2026 {SCHOOL_NAME}. All rights reserved.
      </p>
    </footer>
  );
}
