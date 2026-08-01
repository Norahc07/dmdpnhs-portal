import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/student",
  "/parent",
  "/teacher",
  "/registrar",
];

function roleHome(role) {
  const map = {
    student: "/student",
    teacher: "/teacher",
    parent: "/parent",
    registrar: "/registrar",
  };
  return map[role] || "/login";
}

export async function middleware(request) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const isAuthPage =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/register");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role;
    const status = profile?.status;

    // Pending teachers may only access /teacher/pending
    if (role === "teacher" && status === "pending") {
      if (
        pathname.startsWith("/teacher") &&
        pathname !== "/teacher/pending"
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/teacher/pending";
        return NextResponse.redirect(url);
      }
      if (isProtected && !pathname.startsWith("/teacher")) {
        const url = request.nextUrl.clone();
        url.pathname = "/teacher/pending";
        return NextResponse.redirect(url);
      }
    }

    // Student activation gates
    // Phase 1 done (incomplete + profile) → /student/activate
    // Phase 2 done (pending) → temporary /student dashboard
    // active → full portal
    if (role === "student" && isProtected) {
      const { data: studentRow } = await supabase
        .from("students")
        .select("activation_status, profile_id, section_id, status")
        .eq("profile_id", user.id)
        .maybeSingle();

      const activation = studentRow?.activation_status || "active";
      const onPending = pathname === "/student/pending";
      const onActivate = pathname === "/student/activate";
      const onStudentHome = pathname === "/student";
      const needsEnrollment =
        pathname.startsWith("/student/grades") ||
        pathname.startsWith("/student/attendance");

      if (activation === "incomplete") {
        if (!onActivate) {
          const url = request.nextUrl.clone();
          url.pathname = "/student/activate";
          return NextResponse.redirect(url);
        }
      } else if (activation === "pending") {
        if (onActivate) {
          const url = request.nextUrl.clone();
          url.pathname = "/student";
          return NextResponse.redirect(url);
        }
        // Temporary dashboard allowed; grades/attendance wait for activation
        if (needsEnrollment && !onStudentHome && !onPending) {
          const url = request.nextUrl.clone();
          url.pathname = "/student";
          url.searchParams.set("notice", "activation");
          return NextResponse.redirect(url);
        }
      } else if (activation === "active") {
        if (onActivate || onPending) {
          const url = request.nextUrl.clone();
          url.pathname = "/student";
          return NextResponse.redirect(url);
        }
        const enrolled =
          studentRow?.status === "enrolled" ||
          studentRow?.status === "promoted" ||
          Boolean(studentRow?.section_id);
        if (needsEnrollment && !enrolled) {
          const url = request.nextUrl.clone();
          url.pathname = "/student";
          url.searchParams.set("notice", "enrollment");
          return NextResponse.redirect(url);
        }
      }
    }

    if (isAuthPage && role) {
      let home = roleHome(role);
      if (role === "teacher" && status === "pending") {
        home = "/teacher/pending";
      }
      if (role === "student") {
        const { data: studentRow } = await supabase
          .from("students")
          .select("activation_status, profile_id")
          .eq("profile_id", user.id)
          .maybeSingle();
        const activation = studentRow?.activation_status || "active";
        if (activation === "incomplete") home = "/student/activate";
        else if (activation === "pending") home = "/student";
      }
      if (pathname !== home) {
        const url = request.nextUrl.clone();
        url.pathname = home;
        return NextResponse.redirect(url);
      }
    }

    if (isProtected && role) {
      const allowed = pathname.startsWith(`/${role}`);
      if (!allowed) {
        const url = request.nextUrl.clone();
        url.pathname =
          role === "teacher" && status === "pending"
            ? "/teacher/pending"
            : roleHome(role);
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|manifest.json|sw.js).*)",
  ],
};
