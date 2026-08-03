"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateTeacherProfile } from "@/actions/profile";
import { ProfilePicturePicker } from "@/components/profile/ProfilePicturePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function buildFormState(profile, teacher) {
  return {
    firstName: profile?.first_name || "",
    middleName: profile?.middle_name || "",
    lastName: profile?.last_name || "",
    facultyDept: teacher?.faculty_dept || "",
    gender: teacher?.gender || "",
    birthdate: teacher?.birthdate
      ? String(teacher.birthdate).slice(0, 10)
      : "",
    contactNumber: teacher?.contact_number || "",
    personalEmail: teacher?.personal_email || profile?.email || "",
    address: teacher?.address || "",
  };
}

export function TeacherProfileForm({ profile, teacher }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [saved, setSaved] = useState(() => buildFormState(profile, teacher));
  const [draft, setDraft] = useState(() => buildFormState(profile, teacher));

  const values = editing ? draft : saved;
  const locked = !editing;

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
      const result = await updateTeacherProfile(draft);
      if (result?.error) {
        setError(result.error);
        return;
      }

      setSaved(draft);
      setEditing(false);
      setMessage("Personal details saved.");
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
            This photo appears on your teacher dashboard.
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
              Faculty
            </p>
            <h3 className="mt-1 font-heading text-sm font-bold text-[#3d1212]">
              Personal information
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {editing
                ? "Edit your details, then Save. Teacher ID stays locked."
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
                placeholder="e.g. Maria"
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
              <Label htmlFor="teacherId">Teacher ID</Label>
              <Input
                id="teacherId"
                value={teacher?.teacher_id || ""}
                disabled
                placeholder="Assigned by registrar"
                className="bg-muted/40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="facultyDept">Department</Label>
              <Input
                id="facultyDept"
                disabled={locked}
                placeholder="e.g. English, Science, Math"
                value={values.facultyDept}
                onChange={(e) => setField("facultyDept", e.target.value)}
                className={cn(locked && "bg-muted/40")}
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                disabled={locked}
                value={values.gender}
                onChange={(e) => setField("gender", e.target.value)}
                className={cn(
                  "flex h-9 w-full rounded-md border border-input bg-transparent py-1 pl-3 pr-9 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-70",
                  locked && "bg-muted/40"
                )}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="birthdate">Birthdate</Label>
              <Input
                id="birthdate"
                type="date"
                disabled={locked}
                value={values.birthdate}
                onChange={(e) => setField("birthdate", e.target.value)}
                className={cn(locked && "bg-muted/40")}
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
              <Label htmlFor="personalEmail">Personal / contact email</Label>
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
        </div>
      </form>
    </div>
  );
}
