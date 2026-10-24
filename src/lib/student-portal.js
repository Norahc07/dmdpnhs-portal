/**
 * Student portal module map — used by the sidebar and dashboard grid
 * so labels and order stay the same on every display.
 */

export const STUDENT_PORTAL_GROUPS = [
  { id: "modules", label: "Modules" },
  { id: "account", label: "Account" },
];

export const STUDENT_PORTAL_MODULES = [
  {
    href: "/student",
    label: "Dashboard",
    description: "Overview of your enrollment, today, and shortcuts.",
    group: "modules",
    always: true,
  },
  {
    href: "/student/grades",
    label: "Academic Records",
    description: "Class records, published grades, and remarks.",
    group: "modules",
    requiresEnrolled: true,
  },
  {
    href: "/student/attendance",
    label: "Attendance",
    description: "Present, late, absent, and excused records.",
    group: "modules",
    requiresEnrolled: true,
  },
  {
    href: "/student/schedule",
    label: "Class Schedule",
    description: "Weekly timetable for your assigned section.",
    group: "modules",
    requiresEnrolled: true,
  },
  {
    href: "/student/announcements",
    label: "Announcements & Updates",
    description: "Posts and reminders from your teachers.",
    group: "modules",
    requiresEnrolled: true,
    badge: "announcements",
  },
  {
    href: "/student/calendar",
    label: "Calendar",
    description: "Official DepEd dates and class events.",
    group: "modules",
    always: true,
  },
  {
    href: "/student/requests",
    label: "Documents",
    description: "Upload required files and request official copies.",
    group: "modules",
    always: true,
  },
  {
    href: "/student/evaluation",
    label: "Evaluation",
    description: "Rate the portal and your subject teachers.",
    group: "modules",
    always: true,
  },
  {
    href: "/student/notifications",
    label: "Notifications",
    description: "Unread posts and portal notices.",
    group: "account",
    always: true,
    badge: "announcements",
  },
  {
    href: "/student/profile",
    label: "Profile",
    description: "Photo, personal details, and guardian contacts.",
    group: "account",
    always: true,
  },
  {
    href: "/student/settings",
    label: "Account Settings",
    description: "Account status, sign-in details, and shortcuts.",
    group: "account",
    always: true,
  },
  {
    href: "/student/password",
    label: "Change Password",
    description: "Update the password you use with your LRN.",
    group: "account",
    always: true,
  },
];

export function studentModuleAvailable(module, studentAccess) {
  if (!studentAccess) return true;
  if (module.requiresEnrolled) {
    return Boolean(studentAccess.activated && studentAccess.enrolled);
  }
  return true;
}
