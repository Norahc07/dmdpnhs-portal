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
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = {
  student: [
    { href: "/student", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/profile", label: "My Profile", icon: UserRound },
    { href: "/student/grades", label: "My Grades", icon: BookOpen },
    { href: "/student/attendance", label: "Attendance", icon: ClipboardList },
    { href: "/student/requests", label: "Documents", icon: FileText },
    { href: "/student/calendar", label: "Calendar", icon: CalendarDays },
  ],
  parent: [
    { href: "/parent", label: "Dashboard", icon: LayoutDashboard },
    { href: "/parent/grades", label: "Grades", icon: BookOpen },
    { href: "/parent/attendance", label: "Attendance", icon: ClipboardList },
  ],
  teacher: [
    { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
    { href: "/teacher/profile", label: "My Profile", icon: UserRound },
    { href: "/teacher/students", label: "My Students", icon: Users },
    { href: "/teacher/gradebook", label: "Gradebook", icon: GraduationCap },
    {
      href: "/teacher/validation",
      label: "Grade Validation",
      icon: ClipboardCheck,
      requiresDeptHead: true,
    },
    { href: "/teacher/attendance", label: "Attendance", icon: ClipboardList },
  ],
  registrar: [
    { href: "/registrar", label: "Dashboard", icon: LayoutDashboard },
    { href: "/registrar/activations", label: "Activations", icon: UserCheck },
    { href: "/registrar/academics", label: "Academics", icon: GraduationCap },
    { href: "/registrar/enrollment", label: "Enrollment", icon: BarChart3 },
    { href: "/registrar/teachers", label: "Faculty", icon: Users },
    { href: "/registrar/grades", label: "Grade Lock", icon: Lock },
    { href: "/registrar/students", label: "Promotion", icon: ClipboardList },
    { href: "/registrar/requests", label: "Documents", icon: FileText },
    { href: "/registrar/forms", label: "School Forms", icon: BookOpen },
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
              "relative flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-[#800000] text-white shadow-md shadow-[#800000]/25"
                : "text-[#4a1515]/80 hover:bg-[#800000]/8 hover:text-[#800000]"
            )}
          >
            {active && (
              <span
                aria-hidden
                className="absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#ffd700]"
              />
            )}
            <Icon className={cn("size-4", active && "text-[#ffd700]")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
