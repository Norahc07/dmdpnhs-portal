"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { resetStaffPassword } from "@/actions/auth";
import { LoginCard } from "@/components/auth/LoginForms";
import { AuthRoleSwitch } from "@/components/auth/AuthRoleSwitch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inputClass =
  "h-10 border-[#800000]/15 bg-[#fffaf7] shadow-none focus-visible:border-[#800000]/40 focus-visible:ring-[#800000]/15";

export function EducatorResetPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  return (
    <>
      <AuthRoleSwitch active="educator" />
      <LoginCard
        title="Reset educator password"
        subtitle="Confirm your Teacher ID and registered email, then choose a new password."
        error={error}
        footer={
          <p className="mt-5 text-center text-xs text-neutral-600">
            <Link
              href="/login/teacher"
              className="font-semibold text-[#800000] underline"
            >
              Back to educator sign in
            </Link>
            <span className="mt-2 block text-left leading-relaxed">
              Registrars cannot self-reset here. Ask the school administrator.
            </span>
          </p>
        }
      >
        {done ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
            Password updated. You can sign in with your email or Teacher ID.
          </p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const result = await resetStaffPassword({
                  teacherId: fd.get("teacherId"),
                  email: fd.get("email"),
                  password: fd.get("password"),
                  confirmPassword: fd.get("confirmPassword"),
                });
                if (result?.error) {
                  setError(result.error);
                  toast.error(result.error);
                } else {
                  setDone(true);
                  toast.success(result?.message || "Password updated.");
                }
              });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="teacherId" className="text-[#3d1212]">
                Teacher ID
              </Label>
              <Input
                id="teacherId"
                name="teacherId"
                placeholder="T26-43817"
                required
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#3d1212]">
                Registered email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@dmdpnhs.edu.ph"
                required
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[#3d1212]">
                New password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className={inputClass}
              />
              <p className="text-[11px] text-neutral-500">At least 8 characters</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-[#3d1212]">
                Confirm new password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className={inputClass}
              />
            </div>
            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-[#800000] font-semibold text-white hover:bg-[#6a0000]"
            >
              {pending ? "Saving…" : "Update password"}
            </Button>
          </form>
        )}
      </LoginCard>
    </>
  );
}
