import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import {
  AUTH_GATE_COOKIE,
  AUTH_GATE_COOKIE_OPTIONS,
  parseAuthGate,
  serializeAuthGate,
} from "@/lib/auth-gate";

const PROTECTED_PREFIXES = ["/student", "/teacher", "/registrar"];

function roleHome(role) {
  const map = {
    student: "/student",
    teacher: "/teacher",
    registrar: "/registrar",
  };
  return map[role] || "/login";
}

function clearGateCookie(response) {
  response.cookies.set(AUTH_GATE_COOKIE, "", {
    ...AUTH_GATE_COOKIE_OPTIONS,
    maxAge: 0,
  });
}

function writeGateCookie(response, userId, gate) {
  response.cookies.set(
    AUTH_GATE_COOKIE,
    serializeAuthGate(userId, gate),
    AUTH_GATE_COOKIE_OPTIONS
  );
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

  // Cookie session only here (fast). Pages still verify with getUser().
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

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
    const redirect = NextResponse.redirect(url);
    clearGateCookie(redirect);
    return redirect;
  }

  if (!user) {
    if (request.cookies.get(AUTH_GATE_COOKIE)) clearGateCookie(response);
    return response;
  }

  // Public marketing pages: refresh session only — skip profile/student DB hits.
  if (!isProtected && !isAuthPage) {
    return response;
  }

  let gate = parseAuthGate(
    request.cookies.get(AUTH_GATE_COOKIE)?.value,
    user.id
  );

  if (!gate) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role || "";
    const status = profile?.status || "";
    let activation = "";
    let enrolled = false;

    if (role === "student") {
      const { data: studentRow } = await supabase
        .from("students")
        .select("activation_status, section_id, status")
        .eq("profile_id", user.id)
        .maybeSingle();
      activation = studentRow?.activation_status || "active";
      enrolled =
        studentRow?.status === "enrolled" ||
        studentRow?.status === "promoted" ||
        Boolean(studentRow?.section_id);
    }

    gate = { role, status, activation, enrolled };
    writeGateCookie(response, user.id, gate);
  }

  const role = gate.role;
  const status = gate.status;
  const studentActivation = role === "student" ? gate.activation || "active" : null;
  const studentEnrolled = Boolean(gate.enrolled);

  if (role === "parent") {
    if (isProtected || isAuthPage || pathname.startsWith("/parent")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

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

  if (role === "student" && isProtected) {
    const onPending = pathname === "/student/pending";
    const onActivate = pathname === "/student/activate";
    const onStudentHome = pathname === "/student";
    const needsEnrollment =
      pathname.startsWith("/student/grades") ||
      pathname.startsWith("/student/attendance") ||
      pathname.startsWith("/student/class-attendance") ||
      pathname.startsWith("/student/class-secretary");

    if (studentActivation === "incomplete") {
      if (!onActivate) {
        const url = request.nextUrl.clone();
        url.pathname = "/student/activate";
        return NextResponse.redirect(url);
      }
    } else if (studentActivation === "pending") {
      if (onActivate) {
        const url = request.nextUrl.clone();
        url.pathname = "/student";
        return NextResponse.redirect(url);
      }
      if (needsEnrollment && !onStudentHome && !onPending) {
        const url = request.nextUrl.clone();
        url.pathname = "/student";
        url.searchParams.set("notice", "activation");
        return NextResponse.redirect(url);
      }
    } else if (studentActivation === "active") {
      if (onActivate || onPending) {
        const url = request.nextUrl.clone();
        url.pathname = "/student";
        return NextResponse.redirect(url);
      }
      if (needsEnrollment && !studentEnrolled) {
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
      if (studentActivation === "incomplete") home = "/student/activate";
      else if (studentActivation === "pending") home = "/student";
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

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|manifest.json|sw.js).*)",
  ],
};
