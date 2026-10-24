/**
 * Educator portal module map — used by the sidebar and dashboard grid
 * so labels and order stay the same on every display.
 */

export const EDUCATOR_PORTAL_GROUPS = [
  { id: "modules", label: "Modules" },
  { id: "account", label: "Account" },
];

export const EDUCATOR_PORTAL_MODULES = [
  {
    href: "/teacher",
    label: "Dashboard",
    description: "Overview of your classes, advisory, and shortcuts.",
    group: "modules",
  },
  {
    href: "/teacher/students",
    label: "Student Management",
    description: "Rosters for assigned and advisory sections.",
    group: "modules",
  },
  {
    href: "/teacher/gradebook",
    label: "Academic Records",
    description: "Encode class records, grades, and remarks.",
    group: "modules",
  },
  {
    href: "/teacher/attendance",
    label: "Attendance",
    description: "Mark present, late, absent, or excused by period.",
    group: "modules",
  },
  {
    href: "/teacher/announcements",
    label: "Announcements & Updates",
    description: "Post to the sections you handle.",
    group: "modules",
  },
  {
    href: "/teacher/calendar",
    label: "Calendar",
    description: "Official DepEd dates and class events you add.",
    group: "modules",
  },
  {
    href: "/teacher/documents",
    label: "Documents",
    description: "Review required uploads and official copy requests.",
    group: "modules",
  },
  {
    href: "/teacher/evaluation",
    label: "Evaluation",
    description: "Rate the portal and your assigned sections.",
    group: "modules",
  },
  {
    href: "/teacher/notifications",
    label: "Notifications",
    description: "Reminders and notices for your classes.",
    group: "account",
  },
  {
    href: "/teacher/profile",
    label: "Profile",
    description: "Photo and personal details used across the portal.",
    group: "account",
  },
  {
    href: "/teacher/settings",
    label: "Account Settings",
    description: "Teacher ID, sign-in details, and shortcuts.",
    group: "account",
  },
  {
    href: "/teacher/password",
    label: "Change Password",
    description: "Update the password for your email or Teacher ID.",
    group: "account",
  },
];
