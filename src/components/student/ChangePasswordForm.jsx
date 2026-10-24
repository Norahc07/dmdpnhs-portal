"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { changeAccountPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm({ embedded = false }) {
  const [pending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function onSubmit(event) {
    event.preventDefault();
    startTransition(async () => {
      const result = await changeStudentPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        embedded
          ? "grid max-w-xl gap-3 sm:grid-cols-2"
          : "max-w-md space-y-4 rounded-2xl border border-[#800000]/10 bg-white p-5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]"
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={5}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={5}
        />
      </div>
      <div className={embedded ? "sm:col-span-2" : undefined}>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
