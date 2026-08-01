import { LandingHeader } from "@/components/landing/LandingHeader";
import { cn } from "@/lib/utils";

export function AuthShell({
  children,
  authHref = "/#portals",
  authLabel = "Login",
  wide = false,
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#faf6f4]">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 10% -10%, rgba(128,0,0,0.14), transparent 55%), radial-gradient(ellipse 70% 45% at 100% 0%, rgba(128,0,0,0.08), transparent 50%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(128,0,0,0.08), transparent 55%), linear-gradient(165deg, #fffdfb 0%, #f7efe9 45%, #f3e8e2 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23800000' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <LandingHeader authHref={authHref} authLabel={authLabel} />
        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-12">
          <div className={cn("w-full", wide ? "max-w-4xl" : "max-w-md")}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
