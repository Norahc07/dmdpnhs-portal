"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateStudentProfile } from "@/actions/profile";
import { ProfilePicturePicker } from "@/components/profile/ProfilePicturePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function buildFormState(profile, student) {
  return {
    firstName: profile?.first_name || "",
    middleName: profile?.middle_name || "",
    lastName: profile?.last_name || "",
    contactNumber: student?.contact_number || "",
    personalEmail: student?.personal_email || "",
    address: student?.address || "",
    emergencyContactName: student?.emergency_contact_name || "",
    emergencyContactNumber: student?.emergency_contact_number || "",
  };
}

export function StudentProfileForm({ profile, student }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [saved, setSaved] = useState(() => buildFormState(profile, student));
  const [draft, setDraft] = useState(() => buildFormState(profile, student));

  const values = editing ? draft : saved;
  const locked = !editing;

  const gradeSection = student?.grade_level
    ? `Grade ${student.grade_level} · ${student?.sections?.section_name || "Unassigned"}`
    : "";

  function setField(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit() {
    setDraft(saved);
    setError("");
    setMessage("");
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(saved);
    setError("");
    setMessage("");
    setEditing(false);
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!editing) return;

    setError("");
    setMessage("");

    startTransition(async () => {
      const result = await updateStudentProfile(draft);
      if (result?.error) {
        setError(result.error);
        return;
      }

      setSaved(draft);
      setEditing(false);

      if (result?.parentAccessUpdated) {
        setMessage(
          result.parentSmsSent
            ? "Saved. A new Parent Access Code was sent by SMS to the updated parent contact number."
            : "Saved. A new Parent Access Code was generated for the updated parent number."
        );
      } else {
        setMessage("Personal details saved.");
      }
    });
  }

  return (
    <div
      className="flex w-full items-stretch gap-4"
      style={{ display: "flex", flexDirection: "row", alignItems: "stretch" }}
    >
      <section
        className="relative flex flex-col overflow-hidden rounded-2xl border border-[#800000]/10 bg-white p-5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] sm:p-6"
        style={{ width: "34%", minWidth: 260, flexShrink: 0 }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-[#800000]/8 to-transparent"
        />
        <div className="relative z-10 text-center">
          <h3 className="font-heading text-sm font-bold text-[#3d1212]">
            Profile photo
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            This photo appears on your student dashboard.
          </p>
        </div>
        <div className="relative z-10 mt-6 flex flex-1 flex-col items-center justify-center">
          <ProfilePicturePicker
            profile={profile}
            avatarUrl={avatarUrl}
            onAvatarChange={setAvatarUrl}
            compact
          />
        </div>
      </section>

      <form
        onSubmit={onSubmit}
        className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]"
        style={{ flex: 1 }}
      >
        <div className="portal-panel-head mb-0 flex flex-wrap items-end justify-between gap-2 px-4 py-4 sm:px-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
              Account
            </p>
            <h3 className="mt-1 font-heading text-sm font-bold text-[#3d1212]">
              Personal information
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {editing
                ? "Edit your details, then Save. LRN and grade & section stay locked."
                : "Fields are locked. Click Edit to make changes."}
            </p>
          </div>

          {editing ? (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={cancelEdit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={pending}
                className="bg-[#800000] hover:bg-[#6a0000]"
              >
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-[#800000]/20 transition hover:bg-[#800000]/8"
              onClick={startEdit}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
        {error ? (
          <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {message}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              required={editing}
              disabled={locked}
              placeholder="e.g. Juan"
              value={values.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              className={cn(locked && "bg-muted/40")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="middleName">Middle name</Label>
            <Input
              id="middleName"
              disabled={locked}
              placeholder="e.g. Santos"
              value={values.middleName}
              onChange={(e) => setField("middleName", e.target.value)}
              className={cn(locked && "bg-muted/40")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              required={editing}
              disabled={locked}
              placeholder="e.g. Dela Cruz"
              value={values.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              className={cn(locked && "bg-muted/40")}
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="lrn">LRN</Label>
            <Input
              id="lrn"
              value={student?.lrn || ""}
              disabled
              placeholder="12-digit LRN"
              className="bg-muted/40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="gradeSection">Grade & section</Label>
            <Input
              id="gradeSection"
              value={gradeSection}
              disabled
              placeholder="Assigned by registrar"
              className="bg-muted/40"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="contactNumber">Contact number</Label>
            <Input
              id="contactNumber"
              required={editing}
              disabled={locked}
              placeholder="09XXXXXXXXX"
              value={values.contactNumber}
              onChange={(e) => setField("contactNumber", e.target.value)}
              className={cn(locked && "bg-muted/40")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="personalEmail">Personal email</Label>
            <Input
              id="personalEmail"
              type="email"
              disabled={locked}
              placeholder="you@email.com"
              value={values.personalEmail}
              onChange={(e) => setField("personalEmail", e.target.value)}
              className={cn(locked && "bg-muted/40")}
            />
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <Label htmlFor="address">Home address</Label>
          <Input
            id="address"
            disabled={locked}
            placeholder="House No., Street, Barangay, City"
            value={values.address}
            onChange={(e) => setField("address", e.target.value)}
            className={cn(locked && "bg-muted/40")}
          />
        </div>

        <div className="mt-auto rounded-xl border border-[#800000]/08 bg-[#faf7f5]/70 p-3 pt-3">
          <p className="mb-2 text-xs font-semibold tracking-wide text-[#800000]/80 uppercase">
            Emergency / parent contact
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="emergencyContactName">Contact name</Label>
              <Input
                id="emergencyContactName"
                disabled={locked}
                placeholder="e.g. Maria Dela Cruz"
                value={values.emergencyContactName}
                onChange={(e) =>
                  setField("emergencyContactName", e.target.value)
                }
                className={cn(locked && "bg-muted/40")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="emergencyContactNumber">Contact number</Label>
              <Input
                id="emergencyContactNumber"
                disabled={locked}
                placeholder="09XXXXXXXXX"
                value={values.emergencyContactNumber}
                onChange={(e) =>
                  setField("emergencyContactNumber", e.target.value)
                }
                className={cn(locked && "bg-muted/40")}
              />
              <p className="text-[11px] text-muted-foreground">
                Changing this number issues a new Parent Access Code and SMS to
                the updated contact.
              </p>
            </div>
          </div>
        </div>
        </div>
      </form>
    </div>
  );
}
