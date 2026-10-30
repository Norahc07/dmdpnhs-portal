"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateStudentProfile } from "@/actions/profile";
import { ProfilePicturePicker } from "@/components/profile/ProfilePicturePicker";
import { ChangePasswordForm } from "@/components/student/ChangePasswordForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function buildFormState(profile, student) {
  return {
    firstName: profile?.first_name || "",
    middleName: profile?.middle_name || "",
    lastName: profile?.last_name || "",
    address: student?.address || "",
    emergencyContactName: student?.emergency_contact_name || "",
    emergencyContactNumber: student?.emergency_contact_number || "",
    emergencyContactAddress: student?.emergency_contact_address || "",
  };
}

function fullStudentName(values) {
  const last = values.lastName || "";
  const first = values.firstName || "";
  const middle = values.middleName || "";
  if (!last && !first) return "—";
  return middle ? `${last}, ${first} ${middle}` : `${last}, ${first}`;
}

export function StudentProfileForm({
  profile,
  student,
  accountStatus = "—",
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [saved, setSaved] = useState(() => buildFormState(profile, student));
  const [draft, setDraft] = useState(() => buildFormState(profile, student));

  const values = editing ? draft : saved;
  const locked = !editing;
  const gradeLevel =
    student?.sections?.grade_level || student?.grade_level
      ? `Grade ${student?.sections?.grade_level || student?.grade_level}`
      : "Unassigned";
  const sectionName = student?.sections?.section_name || "Unassigned";
  const schoolYear = student?.sections?.school_year
    ? `SY ${student.sections.school_year}`
    : "Not assigned";

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
            ? "Saved. Guardian contact was updated and an SMS notice was sent to the new number."
            : "Saved. Guardian contact number was updated."
        );
      } else {
        setMessage("Personal details saved.");
      }
    });
  }

  return (
    <div className="space-y-5">
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {editing ? (
          <>
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
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-[#800000]/20 transition hover:bg-[#800000]/8"
            onClick={startEdit}
          >
            <Pencil className="size-3.5" />
            Edit profile
          </Button>
        )}
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <section className="relative overflow-hidden rounded-2xl border border-[#800000]/10 bg-white p-5 shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)] sm:p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-[#800000]/8 to-transparent"
          />
          <div className="relative z-10 text-center">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
              Student photo
            </p>
            <h3 className="mt-1 font-heading text-sm font-bold text-[#3d1212]">
              Profile picture
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              This photo appears on your dashboard and profile.
            </p>
          </div>
          <div className="relative z-10 mt-6 flex justify-center">
            <ProfilePicturePicker
              profile={profile}
              avatarUrl={avatarUrl}
              onAvatarChange={setAvatarUrl}
              compact
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
          <div className="portal-panel-head px-4 py-4 sm:px-5">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
              Student record
            </p>
            <h3 className="mt-1 font-heading text-sm font-bold text-[#3d1212]">
              Name, LRN, grade level, section, and school year
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              LRN, grade level, section, and school year are assigned by the
              registrar.
            </p>
          </div>
          <div className="space-y-4 p-4 sm:p-5">
            <div className="rounded-xl border border-[#800000]/08 bg-[#faf7f5] px-3 py-3">
              <p className="text-[11px] font-medium tracking-wide text-[#800000]/75 uppercase">
                Student name
              </p>
              <p className="mt-1 font-heading text-lg font-bold text-[#3d1212]">
                {fullStudentName(values)}
              </p>
            </div>

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
                  required={editing}
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

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                <Label htmlFor="gradeLevel">Grade level</Label>
                <Input
                  id="gradeLevel"
                  value={gradeLevel}
                  disabled
                  placeholder="Assigned by registrar"
                  className="bg-muted/40"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  value={sectionName}
                  disabled
                  placeholder="Assigned by registrar"
                  className="bg-muted/40"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="schoolYear">School year</Label>
                <Input
                  id="schoolYear"
                  value={schoolYear}
                  disabled
                  placeholder="e.g. 2025-2026"
                  className="bg-muted/40"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="portal-panel-head px-4 py-4 sm:px-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
            Account information
          </p>
          <h3 className="mt-1 font-heading text-sm font-bold text-[#3d1212]">
            Sign-in and home address
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            You sign in with your LRN and password. School SMS goes to the
            parent/guardian number below.
          </p>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <div className="rounded-xl border border-[#800000]/08 bg-[#faf7f5] px-3 py-3">
            <p className="text-[11px] font-medium tracking-wide text-[#800000]/75 uppercase">
              Account status
            </p>
            <p className="mt-1 text-sm font-semibold text-[#3d1212]">
              {accountStatus}
            </p>
          </div>
          <div className="rounded-xl border border-[#800000]/08 bg-[#faf7f5] px-3 py-3">
            <p className="text-[11px] font-medium tracking-wide text-[#800000]/75 uppercase">
              Sign-in ID
            </p>
            <p className="mt-1 text-sm font-semibold text-[#3d1212]">
              LRN {student?.lrn || "—"}
            </p>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="address">Home address</Label>
            <Input
              id="address"
              required={editing}
              disabled={locked}
              placeholder="House No., Street, Barangay, City"
              value={values.address}
              onChange={(e) => setField("address", e.target.value)}
              className={cn(locked && "bg-muted/40")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="emergencyContactName">
              Parent / guardian name
            </Label>
            <Input
              id="emergencyContactName"
              required={editing}
              disabled={locked}
              placeholder="e.g. Maria Dela Cruz"
              value={values.emergencyContactName}
              onChange={(e) => setField("emergencyContactName", e.target.value)}
              className={cn(locked && "bg-muted/40")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="emergencyContactNumber">
              Parent / guardian contact number
            </Label>
            <Input
              id="emergencyContactNumber"
              required={editing}
              disabled={locked}
              placeholder="09XXXXXXXXX"
              value={values.emergencyContactNumber}
              onChange={(e) =>
                setField("emergencyContactNumber", e.target.value)
              }
              className={cn(locked && "bg-muted/40")}
            />
            <p className="text-[11px] text-muted-foreground">
              Changing this number updates SMS alerts for absences and grades.
            </p>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="emergencyContactAddress">
              Parent / guardian address
            </Label>
            <Input
              id="emergencyContactAddress"
              required={editing}
              disabled={locked}
              placeholder="House No., Street, Barangay, City"
              value={values.emergencyContactAddress}
              onChange={(e) =>
                setField("emergencyContactAddress", e.target.value)
              }
              className={cn(locked && "bg-muted/40")}
            />
          </div>
        </div>
      </section>
    </form>

      <section className="overflow-hidden rounded-2xl border border-[#800000]/10 bg-white shadow-[0_12px_28px_-20px_rgba(61,18,18,0.35)]">
        <div className="portal-panel-head px-4 py-4 sm:px-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#800000] uppercase">
            Password management
          </p>
          <h3 className="mt-1 font-heading text-sm font-bold text-[#3d1212]">
            Change the password used with your LRN
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Enter your current password, then choose and confirm a new one.
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <ChangePasswordForm embedded />
        </div>
      </section>
    </div>
  );
}
