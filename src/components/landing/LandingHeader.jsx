"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronDown, GraduationCap, Users } from "lucide-react";
import { APP_NAME, SCHOOL_NAME, SCHOOL_SHORT } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LOGIN_OPTIONS = [
  {
    href: "/login/student",
    label: "I'm a Student",
    description: "LRN & birthdate access",
    icon: GraduationCap,
  },
  {
    href: "/login/parent",
    label: "I'm a Parent",
    description: "Parent access code",
    icon: Users,
  },
  {
    href: "/login/teacher",
    label: "I'm an Educator",
    description: "Faculty login",
    icon: BookOpen,
  },
];

function MenuToggle({ open, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      aria-controls="landing-mobile-menu"
      className="relative -mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-[#800000] transition-colors duration-200 hover:bg-[#800000]/6 active:scale-95 md:hidden"
    >
      <span className="relative block h-3.5 w-5" aria-hidden>
        <span
          className={cn(
            "absolute left-0 block h-0.5 w-5 origin-center rounded-full bg-current transition-transform duration-300 ease-out",
            open ? "translate-y-1.5 rotate-45" : "translate-y-0 rotate-0"
          )}
        />
        <span
          className={cn(
            "absolute top-1.5 left-0 block h-0.5 w-5 rounded-full bg-current transition-all duration-200 ease-out",
            open ? "scale-x-0 opacity-0" : "scale-x-100 opacity-100"
          )}
        />
        <span
          className={cn(
            "absolute top-3 left-0 block h-0.5 w-5 origin-center rounded-full bg-current transition-transform duration-300 ease-out",
            open ? "-translate-y-1.5 -rotate-45" : "translate-y-0 rotate-0"
          )}
        />
      </span>
    </button>
  );
}

function NavItem({ item, onClick, mobile = false, transparent = false }) {
  if (mobile) {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        aria-current={item.active ? "page" : undefined}
        className={cn(
          "group flex items-center justify-between rounded-xl px-3 py-3.5 font-sans text-lg font-medium transition-all duration-300 ease-out active:scale-[0.98]",
          item.active
            ? "bg-[#800000]/6 font-semibold text-[#800000]"
            : "text-neutral-800 hover:bg-[#800000]/4 hover:text-[#800000]"
        )}
      >
        {item.label}
        <span
          aria-hidden
          className={cn(
            "h-1.5 w-1.5 rounded-full bg-[#800000] transition-all duration-300 ease-out",
            item.active
              ? "scale-100 opacity-100"
              : "scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-60"
          )}
        />
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={item.active ? "page" : undefined}
      className={cn(
        "group relative inline-flex items-center py-1.5 font-sans text-sm font-medium transition-all duration-300 ease-out",
        item.active
          ? transparent
            ? "font-semibold text-white"
            : "font-semibold text-[#800000]"
          : transparent
            ? "text-white/80 hover:text-white"
            : "text-neutral-700 hover:text-[#800000]"
      )}
    >
      <span className="transition-transform duration-300 ease-out group-hover:-translate-y-px">
        {item.label}
      </span>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 -bottom-0.5 h-0.5 origin-left rounded-full transition-all duration-300 ease-out",
          transparent ? "bg-[#ffd700]" : "bg-[#800000]",
          item.active
            ? "scale-x-100 opacity-100"
            : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100"
        )}
      />
    </Link>
  );
}

function LoginMenu({
  mobile = false,
  transparent = false,
  showLoginMenu,
  authHref,
  authLabel,
  loginOpen,
  setLoginOpen,
  setOpen,
  loginRef,
}) {
  const btnClass = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 font-(family-name:--font-poppins) text-sm font-semibold transition sm:px-5",
    mobile && "w-full py-3.5 text-base",
    transparent
      ? "bg-[#ffd700] text-[#4a0000] hover:bg-[#ffe44d]"
      : "bg-[#800000] text-white hover:bg-[#6a0000]",
    loginOpen &&
      showLoginMenu &&
      (transparent ? "bg-[#ffe44d]" : "bg-[#6a0000]")
  );

  if (!showLoginMenu) {
    return (
      <Link href={authHref} onClick={() => setOpen(false)} className={btnClass}>
        {authLabel}
      </Link>
    );
  }

  const optionsPanel = (
    <div
      role="menu"
      className="overflow-hidden rounded-xl border border-[#800000]/10 bg-white p-1.5 shadow-xl"
    >
      <p className="px-3 py-2 font-(family-name:--font-poppins) text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        Sign in as
      </p>
      {LOGIN_OPTIONS.map(({ href, label, description, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          role="menuitem"
          tabIndex={loginOpen ? undefined : -1}
          onClick={() => {
            setLoginOpen(false);
            setOpen(false);
          }}
          className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition hover:bg-[#800000]/6"
        >
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#800000]/8 text-[#800000]">
            <Icon className="size-4" />
          </span>
          <span>
            <span className="block font-(family-name:--font-montserrat) text-sm font-semibold text-[#3d1212]">
              {label}
            </span>
            <span className="block font-(family-name:--font-poppins) text-xs text-muted-foreground">
              {description}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );

  return (
    <div
      className={cn("relative", mobile && "w-full")}
      ref={mobile ? undefined : loginRef}
    >
      <button
        type="button"
        onClick={() => setLoginOpen((v) => !v)}
        className={btnClass}
        aria-expanded={loginOpen}
        aria-haspopup="menu"
      >
        Login
        <ChevronDown
          className={cn(
            "size-4 transition-transform duration-300 ease-out",
            loginOpen && "rotate-180"
          )}
        />
      </button>

      {mobile ? (
        <div
          aria-hidden={!loginOpen}
          className={cn(
            "grid transition-all duration-300 ease-out",
            loginOpen
              ? "mt-3 grid-rows-[1fr] opacity-100"
              : "mt-0 grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">{optionsPanel}</div>
        </div>
      ) : (
        loginOpen && (
          <div className="absolute top-full right-0 z-50 mt-2 w-64 duration-200 animate-in fade-in-0 zoom-in-95 slide-in-from-top-1">
            {optionsPanel}
          </div>
        )
      )}
    </div>
  );
}

export function LandingHeader({
  authHref = "/#portals",
  authLabel = "Login",
}) {
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const loginRef = useRef(null);
  const [menuPath, setMenuPath] = useState(pathname);
  const showLoginMenu = authLabel === "Login";

  // Close menus when the route changes (preferred over setState-in-effect)
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
    setLoginOpen(false);
  }

  useEffect(() => {
    function onDocClick(e) {
      if (!loginRef.current?.contains(e.target)) setLoginOpen(false);
    }
    // The mobile sheet keeps its own inline panel, so only guard the desktop popover
    if (loginOpen && !open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [loginOpen, open]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e) {
      if (e.key !== "Escape") return;
      setLoginOpen(false);
      setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    function onChange(e) {
      if (e.matches) setOpen(false);
    }
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  // Solid white header on all public pages
  const transparent = false;

  const nav = [
    { href: "/", label: "Home", active: isHome },
    { href: "/about", label: "About", active: pathname.startsWith("/about") },
    {
      href: "/admission",
      label: "Admission",
      active: pathname.startsWith("/admission"),
    },
    {
      href: "/contact",
      label: "Contact",
      active: pathname.startsWith("/contact"),
    },
  ];

  const loginMenuProps = {
    transparent,
    showLoginMenu,
    authHref,
    authLabel,
    loginOpen,
    setLoginOpen,
    setOpen,
    loginRef,
  };

  function toggleMenu() {
    setOpen((v) => {
      if (v) setLoginOpen(false);
      return !v;
    });
  }

  return (
    <header className="sticky top-0 z-60 border-b border-[#800000]/10 bg-white shadow-sm transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-18 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex min-w-0 items-center gap-2.5 sm:gap-3"
        >
          <Image
            src="/images/logo-pastraportal.png"
            alt={`${APP_NAME} logo`}
            width={48}
            height={48}
            className="size-10 shrink-0 rounded-xl object-cover sm:size-12"
            priority
          />
          <span className="min-w-0 truncate font-heading text-xs font-bold leading-snug text-[#6b0000] sm:text-sm md:text-[15px]">
            <span className="block">{APP_NAME}</span>
            <span className="mt-0.5 block truncate text-[10px] font-semibold tracking-wide text-[#800000]/65 sm:text-[11px]">
              <span className="hidden sm:inline">{SCHOOL_NAME}</span>
              <span className="sm:hidden">{SCHOOL_SHORT}</span>
            </span>
          </span>
        </Link>

        <nav
          className="hidden items-center gap-6 md:flex lg:gap-8"
          aria-label="Main"
        >
          {nav.map((item) => (
            <NavItem key={item.label} item={item} transparent={transparent} />
          ))}
          <LoginMenu {...loginMenuProps} />
        </nav>

        <MenuToggle open={open} onClick={toggleMenu} />
      </div>

      {/* Full-screen mobile menu */}
      <div
        id="landing-mobile-menu"
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 flex flex-col bg-white will-change-transform",
            "transition-[transform,opacity] duration-300 ease-out",
            open ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
          )}
        >
          {/* Spacer keeps the sheet content below the sticky header row */}
          <div className="h-16 shrink-0 border-b border-[#800000]/10 sm:h-18" />

          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-6 pb-12">
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {nav.map((item, index) => (
                <div
                  key={item.label}
                  className={cn(
                    "transition-all duration-300 ease-out",
                    open
                      ? "translate-y-0 opacity-100"
                      : "translate-y-3 opacity-0"
                  )}
                  style={{
                    transitionDelay: open ? `${120 + index * 60}ms` : "0ms",
                  }}
                >
                  <NavItem
                    item={item}
                    mobile
                    transparent={transparent}
                    onClick={() => setOpen(false)}
                  />
                </div>
              ))}
            </nav>

            <div
              className={cn(
                "mt-6 transition-all duration-300 ease-out",
                open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              )}
              style={{
                transitionDelay: open ? `${120 + nav.length * 60}ms` : "0ms",
              }}
            >
              <LoginMenu {...loginMenuProps} mobile />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
