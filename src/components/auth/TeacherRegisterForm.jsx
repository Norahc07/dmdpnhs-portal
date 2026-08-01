"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ClipboardList, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { registerTeacher } from "@/actions/auth";
import {
  SCHOOL_NAME,
  SCHOOL_SHORT,
  teacherIdFormatExample,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const inputClass =
  "h-10 border-[#800000]/15 bg-[#fffaf7] shadow-none focus-visible:border-[#800000]/40 focus-visible:ring-[#800000]/15";

export function TeacherRegisterForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const idExample = teacherIdFormatExample();
  const yearCode = idExample.slice(1, 3);

  return (
    <div className="mx-auto w-full overflow-hidden rounded-2xl border border-[#800000]/12 bg-white/95 shadow-[0_20px_60px_-28px_rgba(80,0,0,0.35)] backdrop-blur-sm">
      <div className="h-1.5 w-full bg-[#800000]" />

      <div className="px-6 pt-6 pb-6 text-center sm:px-8 sm:pt-7 sm:pb-7">
        <p className="font-sans text-xs font-semibold tracking-[0.25em] text-[#800000] uppercase">
          {SCHOOL_SHORT}
        </p>
        <h1 className="mt-2 font-heading text-2xl font-bold text-[#3d1212] sm:text-3xl">
          Faculty Registration
        </h1>
        <p className="mt-1 font-sans text-sm text-neutral-600">
          Create your educator account. A Teacher ID is assigned automatically
          after you register.
        </p>
      </div>

      <div className="grid gap-0 md:grid-cols-2">
        <aside className="border-[#800000]/10 bg-[#800000]/4 px-6 py-6 sm:px-8 md:border-r">
          <div className="flex items-center gap-2 text-[#800000]">
            <ClipboardList className="size-5" />
            <h2 className="font-heading text-lg font-bold">
              Registration instructions
            </h2>
          </div>
          <p className="mt-2 font-sans text-sm leading-relaxed text-neutral-600">
            Follow these steps to join the {SCHOOL_NAME} faculty portal.
          </p>
          <ol className="mt-5 space-y-3">
            {[
              "Complete your name, email, department, and password on the form.",
              `A unique Teacher ID is created for you (example: ${idExample}).`,
              "Save your Teacher ID — you will see it on the next screen.",
              "Wait for the registrar to approve your account before full access.",
              "Sign in with your email or Teacher ID and password.",
            ].map((step, i) => (
              <li
                key={step}
                className="flex gap-3 font-sans text-sm text-[#3d1212]"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#800000] text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="pt-0.5 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-xl border border-[#800000]/15 bg-white px-3 py-3 text-xs text-[#3d1212]">
            <p className="font-semibold text-[#800000]">Teacher ID format</p>
            <p className="mt-1 text-neutral-600">
              <span className="font-medium text-[#3d1212]">T</span> = Teacher ·{" "}
              <span className="font-medium text-[#3d1212]">{yearCode}</span> =
              current year ·{" "}
              <span className="font-medium text-[#3d1212]">XXXXX</span> = unique
              random number
            </p>
          </div>
        </aside>

        <div className="px-6 py-6 sm:px-8">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const result = await registerTeacher({
                  firstName: fd.get("firstName"),
                  lastName: fd.get("lastName"),
                  email: fd.get("email"),
                  password: fd.get("password"),
                  facultyDept: fd.get("facultyDept"),
                });
                if (result?.error) {
                  setError(result.error);
                  toast.error(result.error);
                }
              });
            }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-[#3d1212]">
                  First name
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="Enter your first name"
                  required
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-[#3d1212]">
                  Last name
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Enter your last name"
                  required
                  className={inputClass}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#3d1212]">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                required
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="facultyDept" className="text-[#3d1212]">
                Department / Learning Area
              </Label>
              <Input
                id="facultyDept"
                name="facultyDept"
                placeholder="e.g. Mathematics"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <Label htmlFor="password" className="text-[#3d1212]">
                  Password
                </Label>
                <span className="font-sans text-[11px] text-neutral-500">
                  At least 8 characters
                </span>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  minLength={8}
                  required
                  className={cn(inputClass, "pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 transition hover:bg-[#800000]/8 hover:text-[#800000]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

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
              {pending ? "Creating account…" : "Register & get Teacher ID"}
            </Button>
          </form>
          <p className="mt-5 text-center text-xs text-neutral-600">
            Already registered?{" "}
            <Link
              href="/login/teacher"
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
