"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileText,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  Users,
  UserCheck,
  UserRound,
  BarChart3,
  Lock,
  Megaphone,
  Settings,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  EDUCATOR_PORTAL_GROUPS,
  EDUCATOR_PORTAL_MODULES,
} from "@/lib/educator-portal";
import {
  STUDENT_PORTAL_GROUPS,
  STUDENT_PORTAL_MODULES,
} from "@/lib/student-portal";
import { cn } from "@/lib/utils";

const STUDENT_ICONS = {
  "/student": LayoutDashboard,
  "/student/grades": BookOpen,
  "/student/attendance": ClipboardList,
  "/student/schedule": Clock3,
  "/student/announcements": Megaphone,
  "/student/calendar": CalendarDays,
  "/student/requests": FileText,
  "/student/evaluation": ClipboardCheck,
  "/student/notifications": Bell,
  "/student/profile": UserRound,
  "/student/settings": Settings,
  "/student/password": KeyRound,
};

const EDUCATOR_ICONS = {
  "/teacher": LayoutDashboard,
  "/teacher/students": Users,
  "/teacher/gradebook": GraduationCap,
  "/teacher/attendance": ClipboardList,
  "/teacher/announcements": Megaphone,
  "/teacher/calendar": CalendarDays,
  "/teacher/documents": FileText,
  "/teacher/evaluation": ClipboardCheck,
  "/teacher/notifications": Bell,
  "/teacher/profile": UserRound,
  "/teacher/settings": Settings,
  "/teacher/password": KeyRound,
};

const NAV = {
  secretary: [
    { href: "/student/class-secretary", label: "Secretary home", icon: ShieldCheck },
    { href: "/student/class-attendance", label: "Record attendance", icon: UserCheck },
    {
      href: "/student/class-attendance/history",
      label: "Attendance history",
      icon: ClipboardList,
    },
    { href: "/student", label: "Student portal", icon: LayoutDashboard },
  ],
  registrar: [
    { href: "/registrar", label: "Dashboard", icon: LayoutDashboard },
    { href: "/registrar/activations", label: "Activations", icon: UserCheck },
    { href: "/registrar/academics", label: "Academics", icon: GraduationCap },
    { href: "/registrar/enrollment", label: "Enrollment", icon: BarChart3 },
    { href: "/registrar/trash", label: "Trash", icon: Trash2 },
    { href: "/registrar/teachers", label: "Faculty", icon: Users },
    { href: "/registrar/grades", label: "Grade Lock", icon: Lock },
    { href: "/registrar/promotion", label: "Promotion", icon: ClipboardList },
    { href: "/registrar/requests", label: "Documents", icon: FileText },
    { href: "/registrar/evaluation", label: "Evaluation", icon: ClipboardCheck },
    { href: "/registrar/calendar", label: "Calendar", icon: CalendarDays },
  ],
};

function studentLinks(studentAccess) {
  const { activated, enrolled, isSecretary } = studentAccess || {};
  const links = STUDENT_PORTAL_MODULES.filter((link) => {
    if (link.requiresEnrolled) return Boolean(activated && enrolled);
    return true;
  }).map((link) => ({
    ...link,
    icon: STUDENT_ICONS[link.href] || LayoutDashboard,
  }));

  if (activated && enrolled && isSecretary) {
    const attendanceIndex = links.findIndex(
      (link) => link.href === "/student/attendance"
    );
    const secretaryLink = {
      href: "/student/class-secretary",
      label: "Class secretary",
      icon: ShieldCheck,
      group: "modules",
    };
    if (attendanceIndex >= 0) {
      links.splice(attendanceIndex + 1, 0, secretaryLink);
    } else {
      links.push(secretaryLink);
    }
  }

  return links;
}

function educatorLinks(teacherAccess) {
  const links = EDUCATOR_PORTAL_MODULES.map((link) => ({
    ...link,
    icon: EDUCATOR_ICONS[link.href] || LayoutDashboard,
  }));

  if (teacherAccess?.canValidateGrades) {
    const academicIndex = links.findIndex(
      (link) => link.href === "/teacher/gradebook"
    );
    const validationLink = {
      href: "/teacher/validation",
      label: "Validation",
      icon: ShieldCheck,
      group: "modules",
    };
    if (academicIndex >= 0) {
      links.splice(academicIndex + 1, 0, validationLink);
    } else {
      links.push(validationLink);
    }
  }

  return links;
}

function isNavActive(pathname, href) {
  if (pathname === href) return true;
  if (/^\/(student|teacher|registrar)$/.test(href)) return false;
  if (href === "/student/class-attendance") {
    return pathname === "/student/class-attendance";
  }
  if (href === "/student/settings" || href === "/teacher/settings") {
    return pathname === href;
  }
  return pathname.startsWith(`${href}/`);
}

function isSecretaryPath(pathname) {
  return (
    pathname.startsWith("/student/class-secretary") ||
    pathname.startsWith("/student/class-attendance")
  );
}

function NavLink({ href, label, icon: Icon, pathname, unread, onNavigate }) {
  const active = isNavActive(pathname, href);
  return (
    <Link
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
      <span className="flex-1">{label}</span>
      {unread > 0 ? (
        <span className="rounded-full bg-[#800000] px-1.5 py-0.5 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

function GroupedNav({ groups, links, pathname, unread, onNavigate }) {
  return (
    <nav className="flex flex-1 flex-col gap-4">
      {groups.map((group) => {
        const items = links.filter((link) => link.group === group.id);
        if (!items.length) return null;
        return (
          <div key={group.id} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-[10px] font-semibold tracking-[0.18em] text-[#800000]/70 uppercase">
              {group.label}
            </p>
            {items.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                icon={link.icon}
                pathname={pathname}
                unread={link.badge === "announcements" ? unread : 0}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        );
      })}
    </nav>
  );
}

export function PortalNav({ role, onNavigate, studentAccess, teacherAccess }) {
  const pathname = usePathname() || "";
  const key = typeof role === "string" ? role.toLowerCase() : "";
  const secretaryMode =
    (key === "student" || key === "secretary") &&
    Boolean(studentAccess?.isSecretary) &&
    isSecretaryPath(pathname);

  if (key === "student" && !secretaryMode) {
    return (
      <GroupedNav
        groups={STUDENT_PORTAL_GROUPS}
        links={studentLinks(studentAccess)}
        pathname={pathname}
        unread={Number(studentAccess?.unreadAnnouncements || 0)}
        onNavigate={onNavigate}
      />
    );
  }

  if (key === "teacher") {
    return (
      <GroupedNav
        groups={EDUCATOR_PORTAL_GROUPS}
        links={educatorLinks(teacherAccess)}
        pathname={pathname}
        unread={0}
        onNavigate={onNavigate}
      />
    );
  }

  const links = secretaryMode ? NAV.secretary : NAV[key] ?? [];

  if (!Array.isArray(links) || links.length === 0) {
    return null;
  }

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {links.map(({ href, label, icon: Icon }) => (
        <NavLink
          key={href}
          href={href}
          label={label}
          icon={Icon}
          pathname={pathname}
          unread={0}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
