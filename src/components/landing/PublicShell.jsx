import { LandingHeader } from "@/components/landing/LandingHeader";

export function PublicShell({ children, authHref, authLabel }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <LandingHeader authHref={authHref} authLabel={authLabel} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
