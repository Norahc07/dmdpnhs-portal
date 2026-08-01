"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  GraduationCap,
  Menu,
  Users,
  X,
} from "lucide-react";
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

function NavItem({ item, onClick, mobile = false, transparent = false }) {
  if (mobile) {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        aria-current={item.active ? "page" : undefined}
        className={cn(
          "px-3 py-2.5 font-sans text-sm font-medium transition-all duration-300 ease-out active:scale-[0.98]",
          transparent
            ? item.active
              ? "font-semibold text-[#ffd700]"
              : "text-white/85 hover:pl-4 hover:text-white"
            : item.active
              ? "font-semibold text-[#800000]"
              : "text-neutral-800 hover:pl-4 hover:text-[#800000]"
        )}
      >
        {item.label}
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
    mobile && "w-full",
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
            "size-4 transition duration-200",
            loginOpen && "rotate-180"
          )}
        />
      </button>

      {loginOpen && (
        <div
          role="menu"
          className={cn(
            "z-50 overflow-hidden rounded-xl border border-[#800000]/10 bg-white p-1.5 shadow-xl",
            mobile
              ? "relative mt-2 w-full"
              : "absolute top-full right-0 mt-2 w-64"
          )}
        >
          <p className="px-3 py-2 font-(family-name:--font-poppins) text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Sign in as
          </p>
          {LOGIN_OPTIONS.map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
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
    if (loginOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [loginOpen]);

  // Solid white header on all public pages
  const transparent = false;
  const glass = false;

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

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300 border-b border-[#800000]/10 bg-white shadow-sm"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-18 sm:gap-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Image
            src="/images/logo-pastraportal.png"
            alt={`${APP_NAME} logo`}
            width={48}
            height={48}
            className="size-10 shrink-0 rounded-xl object-cover sm:size-12"
            priority
          />
          <span
            className={cn(
              "min-w-0 truncate font-heading text-xs font-bold leading-snug sm:text-sm md:text-[15px]",
              transparent ? "text-white" : "text-[#6b0000]"
            )}
          >
            <span className="block">{APP_NAME}</span>
            <span
              className={cn(
                "mt-0.5 block truncate text-[10px] font-semibold tracking-wide sm:text-[11px]",
                transparent ? "text-white/75" : "text-[#800000]/65"
              )}
            >
              <span className="hidden sm:inline">{SCHOOL_NAME}</span>
              <span className="sm:hidden">{SCHOOL_SHORT}</span>
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex lg:gap-8" aria-label="Main">
          {nav.map((item) => (
            <NavItem key={item.label} item={item} transparent={transparent} />
          ))}
          <LoginMenu {...loginMenuProps} />
        </nav>

        <button
          type="button"
          className={cn(
            "inline-flex rounded-lg p-2 md:hidden",
            transparent ? "text-white" : "text-[#800000]"
          )}
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <div
          className="border-t border-[#800000]/10 bg-white px-4 py-4 md:hidden"
        >
          <div className="flex flex-col gap-2">
            {nav.map((item) => (
              <NavItem
                key={item.label}
                item={item}
                mobile
                transparent={transparent}
                onClick={() => setOpen(false)}
              />
            ))}
            <div className="pt-2">
              <LoginMenu {...loginMenuProps} mobile />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
