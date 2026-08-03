"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Users,
  UserCheck,
  UserRound,
  BarChart3,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = {
  student: [
    { href: "/student", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/profile", label: "My Profile", icon: UserRound },
    { href: "/student/grades", label: "My Grades", icon: BookOpen },
    { href: "/student/attendance", label: "Attendance", icon: ClipboardList },
    { href: "/student/evaluation", label: "Evaluation", icon: ClipboardCheck },
    { href: "/student/requests", label: "Documents", icon: FileText },
    { href: "/student/calendar", label: "Calendar", icon: CalendarDays },
  ],
  parent: [
    { href: "/parent", label: "Dashboard", icon: LayoutDashboard },
    { href: "/parent/grades", label: "Grades", icon: BookOpen },
    { href: "/parent/attendance", label: "Attendance", icon: ClipboardList },
    { href: "/parent/evaluation", label: "Evaluation", icon: ClipboardCheck },
  ],
  teacher: [
    { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
    { href: "/teacher/profile", label: "My Profile", icon: UserRound },
    { href: "/teacher/students", label: "My Students", icon: Users },
    { href: "/teacher/gradebook", label: "Gradebook", icon: GraduationCap },
    {
      href: "/teacher/validation",
      label: "Validation",
      icon: ShieldCheck,
      requiresDeptHead: true,
    },
    { href: "/teacher/attendance", label: "Attendance", icon: ClipboardList },
    { href: "/teacher/evaluation", label: "Evaluation", icon: ClipboardCheck },
    { href: "/teacher/calendar", label: "Calendar", icon: CalendarDays },
  ],
  registrar: [
    { href: "/registrar", label: "Dashboard", icon: LayoutDashboard },
    { href: "/registrar/activations", label: "Activations", icon: UserCheck },
    { href: "/registrar/academics", label: "Academics", icon: GraduationCap },
    { href: "/registrar/enrollment", label: "Enrollment", icon: BarChart3 },
    { href: "/registrar/teachers", label: "Faculty", icon: Users },
    { href: "/registrar/grades", label: "Grade Lock", icon: Lock },
    { href: "/registrar/promotion", label: "Promotion", icon: ClipboardList },
    { href: "/registrar/requests", label: "Documents", icon: FileText },
    { href: "/registrar/evaluation", label: "Evaluation", icon: ClipboardCheck },
    { href: "/registrar/calendar", label: "Calendar", icon: CalendarDays },
  ],
};

function isNavActive(pathname, href) {
  if (pathname === href) return true;
  if (/^\/(student|parent|teacher|registrar)$/.test(href)) return false;
  return pathname.startsWith(`${href}/`);
}

export function PortalNav({ role, onNavigate, studentAccess, teacherAccess }) {
  const pathname = usePathname() || "";
  const key = typeof role === "string" ? role.toLowerCase() : "";
  let links = NAV[key] ?? [];

  if (key === "student" && studentAccess) {
    const { activated, enrolled } = studentAccess;
    links = links.filter((link) => {
      if (link.href === "/student/grades" || link.href === "/student/attendance") {
        return activated && enrolled;
      }
      return true;
    });
  }

  if (key === "teacher") {
    links = links.filter((link) => {
      if (link.requiresDeptHead) {
        return Boolean(teacherAccess?.canValidateGrades);
      }
      return true;
    });
  }

  if (!Array.isArray(links) || links.length === 0) {
    return null;
  }

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = isNavActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200",
              active
                ? "bg-[#800000]/10 text-[#800000] shadow-sm ring-1 ring-[#800000]/12"
                : "text-[#4a1515]/80 hover:bg-[#800000]/6 hover:text-[#800000]"
            )}
          >
            {active && (
              <span
                aria-hidden
                className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[#800000]"
              />
            )}
            <Icon className={cn("size-4", active && "text-[#800000]")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
