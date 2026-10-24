"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function OptionalEmailField({
  id = "parentEmail",
  name = "parentEmail",
  noneName,
  label = "Parent / guardian email",
  placeholder = "parent@email.com",
  value,
  onChange,
  defaultValue = "",
  none,
  onNoneChange,
  defaultNone = false,
  disabled = false,
  className,
}) {
  const noneField = noneName || `${name}None`;
  const controlled = typeof none === "boolean";
  const [uncontrolledNone, setUncontrolledNone] = useState(Boolean(defaultNone));
  const [uncontrolledEmail, setUncontrolledEmail] = useState(defaultValue || "");

  const isNone = controlled ? none : uncontrolledNone;
  const emailValue = value !== undefined ? value : uncontrolledEmail;

  function setNone(next) {
    if (disabled) return;
    if (controlled) onNoneChange?.(next);
    else setUncontrolledNone(next);
    if (next) {
      if (value !== undefined) onChange?.("");
      else setUncontrolledEmail("");
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div
          role="group"
          aria-label={`${label} options`}
          className="inline-flex rounded-lg border border-[#800000]/15 bg-white p-0.5"
        >
          <button
            type="button"
            disabled={disabled}
            onClick={() => setNone(false)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-semibold transition",
              !isNone
                ? "bg-[#800000] text-white"
                : "text-[#3d1212] hover:bg-[#800000]/8"
            )}
          >
            Email
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setNone(true)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-semibold transition",
              isNone
                ? "bg-[#800000] text-white"
                : "text-[#3d1212] hover:bg-[#800000]/8"
            )}
          >
            None
          </button>
        </div>
      </div>
      <input type="hidden" name={noneField} value={isNone ? "1" : ""} />
      {isNone ? (
        <>
          <input type="hidden" name={name} value="" />
          <Input
            id={id}
            disabled
            readOnly
            value="None"
            className="bg-muted/40"
          />
        </>
      ) : (
        <Input
          id={id}
          name={name}
          type="email"
          autoComplete="email"
          placeholder={placeholder}
          disabled={disabled}
          value={emailValue}
          onChange={(e) => {
            if (value !== undefined) onChange?.(e.target.value);
            else setUncontrolledEmail(e.target.value);
          }}
        />
      )}
      <p className="text-[11px] text-muted-foreground">
        Choose <span className="font-semibold">None</span> if the parent or
        guardian does not have an email address.
      </p>
    </div>
  );
}
