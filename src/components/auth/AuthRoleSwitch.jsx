import Link from "next/link";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { href: "/login/student", key: "student", label: "Student" },
  { href: "/login/teacher", key: "educator", label: "Educator" },
];

export function AuthRoleSwitch({ active = "student" }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-[#800000]/12 bg-white/80 p-1">
      {OPTIONS.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-2 text-center text-sm font-semibold transition",
              isActive
                ? "bg-[#800000] text-white shadow-sm"
                : "text-[#3d1212] hover:bg-[#800000]/6"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
