"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ClipboardList, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { registerStudent, resetStudentPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoginCard } from "@/components/auth/LoginForms";
import { SCHOOL_NAME, SCHOOL_SHORT } from "@/lib/constants";
import { cn } from "@/lib/utils";

const inputClass =
  "h-10 border-[#800000]/15 bg-[#fffaf7] shadow-none focus-visible:border-[#800000]/40 focus-visible:ring-[#800000]/15";

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  placeholder,
  hint,
  minLength = 5,
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <Label htmlFor={id} className="text-[#3d1212]">
          {label}
        </Label>
        {hint ? (
          <span className="font-sans text-[11px] text-neutral-500">{hint}</span>
        ) : null}
      </div>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
          minLength={minLength}
          className={cn(inputClass, "pr-10")}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 transition hover:bg-[#800000]/8 hover:text-[#800000]"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export function StudentRegisterForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className="mx-auto w-full overflow-hidden rounded-2xl border border-[#800000]/12 bg-white/95 shadow-[0_20px_60px_-28px_rgba(80,0,0,0.35)] backdrop-blur-sm">
      <div className="h-1.5 w-full bg-[#800000]" />

      <div className="px-6 pt-6 pb-6 text-center sm:px-8 sm:pt-7 sm:pb-7">
        <p className="font-sans text-xs font-semibold tracking-[0.25em] text-[#800000] uppercase">
          {SCHOOL_SHORT}
        </p>
        <h1 className="mt-2 font-heading text-2xl font-bold text-[#3d1212] sm:text-3xl">
          Student Registration
        </h1>
        <p className="mt-1 font-sans text-sm text-neutral-600">
          Phase 1: verify your LRN and birthdate, then create your portal
          password. You must already be enrolled by the registrar.
        </p>
      </div>

      <div className="grid gap-0 md:grid-cols-2">
        {/* Column 1 — instructions */}
        <aside className="border-[#800000]/10 bg-[#800000]/4 px-6 py-6 sm:px-8 md:border-r">
          <div className="flex items-center gap-2 text-[#800000]">
            <ClipboardList className="size-5" />
            <h2 className="font-heading text-lg font-bold">
              Registration instructions
            </h2>
          </div>
          <p className="mt-2 font-sans text-sm leading-relaxed text-neutral-600">
            Follow these steps so the registrar can verify your account at{" "}
            {SCHOOL_NAME}.
          </p>
          <ol className="mt-5 space-y-3">
            {[
              "Ask the registrar to enroll your LRN in the system first.",
              "Phase 1: Verify with your LRN and birthdate, then create a password.",
              "Phase 2: Enter personal details and parent/guardian contacts.",
              "Wait for registrar verification (they will call the parent number).",
              "When activated, sign in with your LRN and password. Parents receive an SMS access code from DMDPNHS.",
            ].map((step, i) => (
              <li key={step} className="flex gap-3 font-sans text-sm text-[#3d1212]">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#800000] text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="leading-relaxed pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </aside>

        {/* Column 2 — form */}
        <div className="px-6 py-6 sm:px-8">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const result = await registerStudent({
                  lrn: fd.get("lrn"),
                  birthdate: fd.get("birthdate"),
                  password: fd.get("password"),
                  confirmPassword: fd.get("confirmPassword"),
                });
                if (result?.error) {
                  setError(result.error);
                  toast.error(result.error);
                } else if (result?.message) {
                  toast.success(result.message);
                }
              });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="lrn" className="text-[#3d1212]">
                LRN
              </Label>
              <Input
                id="lrn"
                name="lrn"
                inputMode="numeric"
                maxLength={12}
                placeholder="12-digit LRN"
                required
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birthdate" className="text-[#3d1212]">
                Birthdate
              </Label>
              <Input
                id="birthdate"
                name="birthdate"
                type="date"
                required
                placeholder="YYYY-MM-DD"
                className={inputClass}
              />
            </div>
            <PasswordField
              id="password"
              name="password"
              label="Create password"
              autoComplete="new-password"
              placeholder="Enter your password"
              hint="At least 5 characters"
              minLength={5}
            />
            <PasswordField
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              minLength={5}
            />
            {error ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-[#800000] font-semibold text-white hover:bg-[#6a0000]"
            >
              {pending ? "Verifying…" : "Continue to personal details"}
            </Button>
          </form>
          <p className="mt-5 text-center text-xs text-neutral-600">
            Already registered?{" "}
            <Link
              href="/login/student"
              className="font-semibold text-[#800000] underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function StudentResetPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  return (
    <LoginCard
      title="Reset password"
      subtitle="Verify your LRN and birthdate, then choose a new password."
      error={error}
      footer={
        <p className="mt-5 text-center text-xs text-neutral-600">
          <Link
            href="/login/student"
            className="font-semibold text-[#800000] underline"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      {done ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          Password updated. You can sign in with your LRN and new password.
        </p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const result = await resetStudentPassword({
                lrn: fd.get("lrn"),
                birthdate: fd.get("birthdate"),
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
            <Label htmlFor="lrn" className="text-[#3d1212]">
              LRN
            </Label>
            <Input
              id="lrn"
              name="lrn"
              inputMode="numeric"
              maxLength={12}
              placeholder="12-digit LRN"
              required
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="birthdate" className="text-[#3d1212]">
              Birthdate
            </Label>
            <Input
              id="birthdate"
              name="birthdate"
              type="date"
              required
              placeholder="YYYY-MM-DD"
              className={inputClass}
            />
          </div>
          <PasswordField
            id="password"
            name="password"
            label="New password"
            autoComplete="new-password"
            placeholder="Enter your password"
            hint="At least 5 characters"
            minLength={5}
          />
          <PasswordField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm new password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            minLength={5}
          />
          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-[#800000] font-semibold text-white hover:bg-[#6a0000]"
          >
            {pending ? "Updating…" : "Update password"}
          </Button>
        </form>
      )}
    </LoginCard>
  );
}
