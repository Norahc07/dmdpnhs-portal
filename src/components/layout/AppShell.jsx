"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { PortalNav } from "@/components/layout/PortalNav";
import { APP_NAME, SCHOOL_SHORT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";

function MenuToggle({ open, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      className={cn(
        "relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#800000]/15 bg-white text-[#800000] shadow-sm transition hover:bg-[#800000]/5 active:scale-95",
        className
      )}
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

function BrandBlock({ size = "md" }) {
  const logoSize = size === "lg" ? 72 : 56;
  return (
    <div className="flex flex-col items-center px-2 text-center">
      <Image
        src="/images/logo-pastraportal.png"
        alt={`${APP_NAME} logo`}
        width={logoSize}
        height={logoSize}
        className={cn(
          "mb-2 rounded-2xl object-cover",
          size === "lg" ? "size-18" : "size-14"
        )}
        priority={size === "md"}
      />
      <p className="text-xs font-semibold tracking-[0.2em] text-[#800000]/70 uppercase">
        {SCHOOL_SHORT}
      </p>
      <h1
        className={cn(
          "mt-1 font-semibold text-[#4a1515]",
          size === "lg" ? "text-xl" : "text-lg"
        )}
      >
        {APP_NAME}
      </h1>
    </div>
  );
}

function SidebarBody({ role, onNavigate, studentAccess, teacherAccess }) {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-6">
        <BrandBlock size="md" />
      </div>

      <PortalNav
        role={role}
        onNavigate={onNavigate}
        studentAccess={studentAccess}
        teacherAccess={teacherAccess}
      />

      <form action={logout} className="mt-auto">
        <Button
          type="submit"
          variant="ghost"
          className="mt-4 w-full justify-start text-[#4a1515]/70"
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </form>
    </div>
  );
}

export function AppShell({
  role,
  children,
  title,
  subtitle,
  studentAccess,
  teacherAccess,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState(pathname);

  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-[#f7f4f1]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[#800000]/10 bg-white md:flex">
        <SidebarBody
          role={role}
          studentAccess={studentAccess}
          teacherAccess={teacherAccess}
        />
      </aside>

      {/* Mobile top bar: brand when closed; burger only when menu is open */}
      <header
        className={cn(
          "sticky top-0 z-60 flex items-center gap-3 border-b border-[#800000]/10 bg-white/95 px-4 py-3 backdrop-blur md:hidden",
          menuOpen ? "justify-end" : "justify-between"
        )}
      >
        {!menuOpen && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Image
              src="/images/logo-pastraportal.png"
              alt={`${APP_NAME} logo`}
              width={32}
              height={32}
              className="size-8 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 text-left">
              <p className="truncate text-[10px] font-semibold tracking-[0.18em] text-[#800000]/70 uppercase">
                {SCHOOL_SHORT}
              </p>
              <p className="truncate text-sm font-semibold text-[#4a1515]">
                {APP_NAME}
              </p>
            </div>
          </div>
        )}
        <MenuToggle
          open={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        />
      </header>

      {/* Mobile menu: slides in from the right */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          menuOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!menuOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-[#3d1212]/40 transition-opacity duration-300 ease-out",
            menuOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMenuOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setMenuOpen(false);
          }}
          role="button"
          tabIndex={menuOpen ? 0 : -1}
          aria-label="Close menu"
        />

        <aside
          className={cn(
            "absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-[-12px_0_40px_-16px_rgba(61,18,18,0.35)] will-change-transform",
            "transition-transform duration-300 ease-out",
            menuOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          {/* Spacer matching sticky header height so content clears the fixed toggle */}
          <div className="h-17 shrink-0 border-b border-[#800000]/10" />
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-4 pt-6 pb-2">
              <BrandBlock size="lg" />
            </div>
            <div className="px-4 pb-10">
              <PortalNav
                role={role}
                onNavigate={() => setMenuOpen(false)}
                studentAccess={studentAccess}
                teacherAccess={teacherAccess}
              />
              <form action={logout} className="mt-6">
                <Button
                  type="submit"
                  variant="ghost"
                  className="w-full justify-start text-[#4a1515]/70"
                >
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </aside>
      </div>

      <main className="min-h-screen md:ml-64">
        <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          {(title || subtitle) && (
            <header className="mb-6">
              {title && (
                <h2 className="text-2xl font-semibold tracking-tight text-[#3d1212]">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              )}
            </header>
          )}

          {children}
        </div>
      </main>
    </div>
  );
}
