"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { changeAccountPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const inputClass =
  "h-10 border-[#800000]/15 bg-[#fffaf7] shadow-none focus-visible:border-[#800000]/40 focus-visible:ring-[#800000]/15";

function PasswordField({
  id,
  label,
  hint,
  placeholder,
  autoComplete,
  value,
  onChange,
  minLength,
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        {hint ? (
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        ) : null}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
          minLength={minLength}
          className={cn(inputClass, "pr-10")}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 transition hover:bg-[#800000]/8 hover:text-[#800000]"
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export function ChangePasswordForm({
  embedded = false,
  audience = "student",
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const signInHint =
    audience === "teacher"
      ? "This password is used with your email or Teacher ID."
      : "This password is used with your LRN.";

  function onSubmit(event) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await changeAccountPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    });
  }

  const fields = (
    <form onSubmit={onSubmit} className="grid gap-4">
      <PasswordField
        id="current-password"
        label="Current password"
        placeholder="Enter your current password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordField
          id="new-password"
          label="New password"
          hint="At least 5 characters"
          placeholder="Enter a new password"
          autoComplete="new-password"
          minLength={5}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          placeholder="Re-enter the new password"
          autoComplete="new-password"
          minLength={5}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {signInHint} The new password must match confirmation and differ from
        the current one.
      </p>
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <div>
        <Button
          type="submit"
          disabled={pending}
          className="w-full bg-[#800000] font-semibold text-white hover:bg-[#6a0000] sm:w-auto"
        >
          {pending ? "Saving…" : "Update password"}
        </Button>
      </div>
    </form>
  );

  if (embedded) return fields;

  return (
    <section className="max-w-2xl overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
      <div className="portal-panel-head px-4 py-4 sm:px-5">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
          Password management
        </p>
        <h3 className="mt-1 font-heading text-sm font-bold text-[#3d1212]">
          {audience === "teacher"
            ? "Change the password for educator sign-in"
            : "Change the password used with your LRN"}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Enter your current password, then choose and confirm a new one.
        </p>
      </div>
      <div className="p-4 sm:p-5">{fields}</div>
    </section>
  );
}
