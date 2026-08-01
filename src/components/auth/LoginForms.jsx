"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loginParent,
  loginStaff,
  loginStudent,
} from "@/actions/auth";
import { SCHOOL_NAME, SCHOOL_SHORT } from "@/lib/constants";
import { cn } from "@/lib/utils";

const loginInputClass =
  "h-10 border-[#800000]/15 bg-[#fffaf7] shadow-none focus-visible:border-[#800000]/40 focus-visible:ring-[#800000]/15";

const loginLabelClass = "text-[#3d1212]";

export function LoginCard({ title, subtitle, children, error, footer, className }) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-[#800000]/12 bg-white/95 shadow-[0_20px_60px_-28px_rgba(80,0,0,0.35)] backdrop-blur-sm",
        className
      )}
    >
      <div className="h-1.5 w-full bg-[#800000]" />
      <div className="p-6 sm:p-7">
        <div className="mb-6 text-center">
          <p className="font-sans text-xs font-semibold tracking-[0.25em] text-[#800000] uppercase">
            {SCHOOL_SHORT}
          </p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-[#3d1212]">
            {title}
          </h1>
          <p className="mt-1 font-sans text-sm text-neutral-600">
            {subtitle || SCHOOL_NAME}
          </p>
        </div>
        {children}
        {error && (
          <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        {footer}
      </div>
    </div>
  );
}

function useLoginAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function run(action) {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      } else if (result?.message) {
        toast.success(result.message);
      }
    });
  }

  return { pending, error, run };
}

export function StudentLoginForm() {
  const { pending, error, run } = useLoginAction();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <LoginCard
      title="Student Login"
      subtitle="Sign in with your LRN and password"
      error={error}
      footer={
        <div className="mt-5 space-y-2 text-center text-xs text-neutral-600">
          <p>
            <Link
              href="/login/student/reset"
              className="font-medium text-[#800000] underline-offset-2 hover:underline"
            >
              Reset password
            </Link>
          </p>
          <p>
            No account yet?{" "}
            <Link
              href="/register/student"
              className="font-semibold text-[#800000] underline-offset-2 hover:underline"
            >
              Register Account
            </Link>
          </p>
        </div>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          run(() =>
            loginStudent({
              lrn: fd.get("lrn"),
              password: fd.get("password"),
            })
          );
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="lrn" className={loginLabelClass}>
            Learner Reference Number (LRN)
          </Label>
          <Input
            id="lrn"
            name="lrn"
            inputMode="numeric"
            maxLength={12}
            placeholder="12-digit LRN"
            required
            className={loginInputClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className={loginLabelClass}>
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              className={cn(loginInputClass, "pr-10")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 transition hover:bg-[#800000]/8 hover:text-[#800000]"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>
        <Button
          type="submit"
          className="w-full bg-[#800000] font-semibold text-white hover:bg-[#6a0000]"
          disabled={pending}
        >
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </LoginCard>
  );
}

export function ParentLoginForm() {
  const { pending, error, run } = useLoginAction();

  return (
    <LoginCard
      title="Parent Login"
      subtitle="Sign in with your Parent Access Code"
      error={error}
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          run(() => loginParent({ accessCode: fd.get("accessCode") }));
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="accessCode" className={loginLabelClass}>
            Parent Access Code
          </Label>
          <Input
            id="accessCode"
            name="accessCode"
            placeholder="e.g. P26-12345"
            required
            className={loginInputClass}
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-[#800000] font-semibold text-white hover:bg-[#6a0000]"
          disabled={pending}
        >
          {pending ? "Signing in…" : "Sign in as Parent"}
        </Button>
      </form>
    </LoginCard>
  );
}

export function TeacherLoginForm() {
  const { pending, error, run } = useLoginAction();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <LoginCard
      title="Teacher Login"
      subtitle="Sign in with your faculty email or Teacher ID"
      error={error}
      footer={
        <p className="mt-4 text-center text-xs text-neutral-600">
          New faculty?{" "}
          <Link href="/register/teacher" className="text-[#800000] underline">
            Register for faculty access
          </Link>
        </p>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          run(() =>
            loginStaff({
              email: fd.get("email"),
              password: fd.get("password"),
            })
          );
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email" className={loginLabelClass}>
            Email or Teacher ID
          </Label>
          <Input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            placeholder="you@dmdpnhs.edu.ph or T26-43817"
            required
            className={loginInputClass}
          />
          <p className="text-[11px] text-neutral-500">
            Use the email you registered with, or your Teacher ID (e.g. T26-43817).
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className={loginLabelClass}>
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              className={cn(loginInputClass, "pr-10")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 transition hover:bg-[#800000]/8 hover:text-[#800000]"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>
        <Button
          type="submit"
          className="w-full bg-[#800000] font-semibold text-white hover:bg-[#6a0000]"
          disabled={pending}
        >
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </LoginCard>
  );
}
